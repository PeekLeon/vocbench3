import { Component, EventEmitter, forwardRef, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CodemirrorComponent } from '@ctrl/ngx-codemirror';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as CodeMirror from 'codemirror';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cookie } from 'src/app/utils/Cookie';
import { ExpressionCheckResponse, ManchesterServices, ObjectError } from '../../../services/manchesterServices';
import { ModalOptions } from '../../modal/Modals';
import { SearchMode } from './../../../models/Properties';
import { SearchServices } from './../../../services/searchServices';
import { HelperModal } from './modal/helperModal';

@Component({
    selector: 'manchester-editor',
    templateUrl: "manchesterEditorComponent.html",
    providers: [{
        provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ManchesterEditorComponent), multi: true,
    }],
    host: { class: "vbox" }
})

export class ManchesterEditorComponent implements ControlValueAccessor {
    @Input() context: ManchesterCtx;
    @Input() disabled: boolean;
    @Output('skipSemCheck') skipSemCheckEmitter: EventEmitter<boolean> = new EventEmitter();

    @ViewChild('cmEditor') private cmEditorView: CodemirrorComponent;

    code: string;
    editorConfig: CodeMirror.EditorConfiguration;

    skipSemanticCheck: boolean = false;

    private cmEditor: CodeMirror.EditorFromTextArea;
    private markers: CodeMirror.TextMarker[] = [];
    codeValid: boolean = true;
    private codeValidationTimer: number;
    codeInvalidDetails: string;

    constructor(private manchesterService: ManchesterServices, private searchServices: SearchServices, private modalService: NgbModal) { }

    ngOnInit() {
        this.editorConfig = {
            lineNumbers: true,
            mode: "manchester",
            indentUnit: 4,
            indentWithTabs: true,
            lineWrapping: true,
            readOnly: this.disabled,
            viewportMargin: Infinity, //with height:auto applied to .CodeMirror class, lets the editor expand its heigth dinamically
                                    //moreover, .CodeMirror-scroll { height: 300px; } sets an height limit
            extraKeys: { "Ctrl-Space": "autocomplete" },
            //unfortunately @types/codemirror seems to not recognize hints types, so I need to provide the hintOptions as done in ngAfterViewInit
            // hintOptions: {
            //     hint: (cm: CodeMirror.Editor, callback: (hints: CodeMirror.Hints) => any) => {
            //         return this.asyncHintFunction();
            //     }
            // }
        };

        this.skipSemanticCheck = Cookie.getCookie(Cookie.MANCH_EXPR_SKIP_SEMANTIC_CHECK) == "true";
        this.skipSemCheckEmitter.emit(this.skipSemanticCheck);
    }

    ngAfterViewInit() {
        this.cmEditor = this.cmEditorView.codeMirror;
        let hintOptions: any = {
            hint: (cm: CodeMirror.Editor, callback: (hints: any) => any) => {
                return this.asyncHintFunction();
            }
        };
        this.editorConfig['hintOptions'] = hintOptions;
    }


    ngOnChanges(changes: SimpleChanges) {
        if (changes['disabled']) {
            this.editorConfig.readOnly = changes['disabled'].currentValue;
        }
    }

    onCodeChange() {
        clearTimeout(this.codeValidationTimer);
        this.propagateChange(null); //in order to prevent that OK is enabled in the meantime an expr check is performed
        this.codeValidationTimer = window.setTimeout(() => { this.validateExpression(this.code); }, 1000);
    }

    onSkipSemCheckChange() {
        Cookie.setCookie(Cookie.MANCH_EXPR_SKIP_SEMANTIC_CHECK, this.skipSemanticCheck+"");
        this.skipSemCheckEmitter.emit(this.skipSemanticCheck);
        clearTimeout(this.codeValidationTimer);
        this.validateExpression(this.code);
    }

    /**
     * Open helper modal
     */
    openHelper() {
        this.modalService.open(HelperModal, new ModalOptions());
    }

    /**
     * This method manages hints window (activated via "crtl-space").
     */
    private asyncHintFunction(): Promise<any> {
        let wordRegExp = /[\w|:$]+/;
        let cur = this.cmEditor.getDoc().getCursor();
        let curLine = this.cmEditor.getDoc().getLine(cur.line);
        let end = cur.ch;
        let start = end;
        while (start && wordRegExp.test(curLine.charAt(start - 1))) --start;
        let word = start != end && curLine.slice(start, end);

        if (word != "") {
            // if a word contains ":" it calls serachURIList otherwise it calls searchPrefix and search in keywords
            if (word.indexOf(":") != -1) {
                //update start value to put hint choosen after ":"
                for (let i = start; i <= end; i++) {
                    if (curLine.charAt(i) == ":") {
                        start = i + 1;
                        break;
                    }
                }
                return this.searchServices.searchURIList(word, SearchMode.startsWith, 200).pipe(
                    map(results => {
                        if (results.length > 199) {
                            results.sort();
                            results.push("...");
                            return {
                                from: CodeMirror.Pos(cur.line, start),
                                to: CodeMirror.Pos(cur.line, end),
                                list: results
                            };
                        }
                        return {
                            from: CodeMirror.Pos(cur.line, start),
                            to: CodeMirror.Pos(cur.line, end),
                            list: results.sort()
                        };
                    })
                ).toPromise();
            } else { // here it looks for between keywords and prefixes
                let keywords = ["SOME", "ONLY", "VALUE", "MIN", "MAX", "EXACTLY", "SELF", "LENGTH", "MINLENGTH", "MAXLENGTH", "PATTERN", "LANGRANGE", "OR", "AND", "NOT", "THAT"]; // remeber to check and update also manchester.js file in case of modify
                let filterKeywords = keywords.filter(w => w.startsWith(word.toUpperCase())).sort();
                return this.searchServices.searchPrefix(word, SearchMode.startsWith).pipe(
                    map(results => {
                        // let list: CodeMirror.Hint[] = []; // it is a particular data structure that allows me to add a reference for the css ( a list of objects)
                        let list: any[] = []; // it is a particular data structure that allows me to add a reference for the css ( a list of objects)
                        if (results.length > 0 && filterKeywords.length > 0) { //  case in which you need to add a separator in hints windows ( first keyword and then prefixes)
                            filterKeywords.forEach(value => {
                                if (value == "SOME" || value == "ONLY" || value == "VALUE" || value == "MIN" || value == "MAX" || value == "EXACTLY" || value == "SELF") {
                                    list.push({ text: value, className: "quantifier" });
                                } else if (value == "LANGRANGE" || value == "LENGTH" || value == "MAXLENGTH" || value == "MINLENGTH" || value == "PATTERN" || value == "<" || value == "<=" || value == ">" || value == ">=") {
                                    list.push({ text: value, className: "facet" });
                                } else if (value == "AND" || value == "OR" || value == "NOT" || value == "THAT") {
                                    list.push({ text: value, className: "conjuction" });
                                }

                            });
                            results.sort().forEach(value => {
                                if (results.indexOf(value) == 0) { // check to verify if it is the first element of array
                                    list.push({ text: value + ":", className: "hint-separator" }); // add separator because start prefixes. Add also ":" to each value of result array
                                } else {
                                    list.push({ text: value + ":" });
                                }
                                //list.push({ text: value + ":" })
                            });
                            return {
                                from: CodeMirror.Pos(cur.line, start),
                                to: CodeMirror.Pos(cur.line, end),
                                list: list
                            };

                        } else { // case only eighter keywords or prefixes
                            if (filterKeywords.length > 0) {
                                filterKeywords.forEach(value => {
                                    if (value == "SOME" || value == "ONLY" || value == "VALUE" || value == "MIN" || value == "MAX" || value == "EXACTLY" || value == "SELF" || value == "INVERSE") {
                                        list.push({ text: value, className: "quantifier" });
                                    } else if (value == "LANGRANGE" || value == "LENGTH" || value == "MAXLENGTH" || value == "MINLENGTH" || value == "PATTERN" || value == "<" || value == "<=" || value == ">" || value == ">=") {
                                        list.push({ text: value, className: "facet" });
                                    } else if (value == "AND" || value == "OR" || value == "NOT" || value == "THAT") {
                                        list.push({ text: value, className: "conjuction" });
                                    }

                                });
                            } else if (results.length > 0) {
                                results.sort().forEach(value => {
                                    list.push({ text: value + ":" });
                                });
                            }

                            let obj = {
                                from: CodeMirror.Pos(cur.line, start),
                                to: CodeMirror.Pos(cur.line, end),
                                list: list
                            };
                            if (obj.list.length > 0) {
                                return obj;
                            }
                        }
                    })
                ).toPromise();
            }
        }
    }

    /**
     * 
     * @param response 
     * This method underlines errors in Manchester editor
     */
    errorMarks(response: ObjectError[]) {
        this.markers.forEach(value => { // it cleans words that have been marked (useful when applying changes to underlined words) 
            value.clear();
        });
        response.forEach(value => {
            if (value.type == "semantic") {
                let pattern = value.qname + "\\b|" + value.iri; // regex checks if there are some word in text editor which match with any uri or qname if this happens takes its position with "positionWord"
                // let positionWord = this.cmEditor.getDoc().getSearchCursor(new RegExp(pattern)); // it takes word position
                let positionWord = (<any>this.cmEditor.getDoc()).getSearchCursor(new RegExp(pattern)); // it takes word position
                for (let i = 0; i <= value.occurrence; i++) {
                    positionWord.findNext();// it takes match in text editor
                }
                let marker = this.cmEditor.getDoc().markText(positionWord.from(), positionWord.to(), { className: "underline", title: value.msg }); //it underlines word that match
                this.markers.push(marker);// insert word into array that contains matched and underlined words
            } else {
                let startWordPosition = this.cmEditor.getDoc().posFromIndex(value.occurrence); // it takes the position from word start ch
                let endWord = value.occurrence + value.offendingTerm.length; //it calculates ch of the word end ( -1 because we just are on the first character)
                let endWordPosition = this.cmEditor.getDoc().posFromIndex(endWord); // it takes the position of the last character of the word
                let detailsExpectedTokens = value.expectedTokens.join("\n");
                if (value.offendingTerm == "<EOF>") {
                    let startWordPosition = this.cmEditor.getDoc().posFromIndex(value.occurrence - 1); // it takes the position from word start ch
                    let endWordPosition = this.cmEditor.getDoc().posFromIndex(value.occurrence);
                    let marker = this.cmEditor.getDoc().markText(startWordPosition, endWordPosition, { className: "underline", title: detailsExpectedTokens }); //it underlines word that match
                    this.markers.push(marker);// insert word into array that contains matched and underlined words
                } else {
                    let marker = this.cmEditor.getDoc().markText(startWordPosition, endWordPosition, { className: "underline", title: detailsExpectedTokens }); //it underlines word that match
                    this.markers.push(marker);// insert word into array that contains matched and underlined words
                }
            }
        });
    }



    validateExpression(code: string) {
        let validationFn: Observable<ExpressionCheckResponse>;
        if (this.context == ManchesterCtx.datatypeFacets) {
            validationFn = this.manchesterService.checkDatatypeExpression(code);
        } else if (this.context == ManchesterCtx.datatypeEnumeration) {
            validationFn = this.manchesterService.checkLiteralEnumerationExpression(code);
        } else {
            validationFn = this.manchesterService.checkExpression(code, this.skipSemanticCheck);
        }
        validationFn.subscribe(
            (checkResp: ExpressionCheckResponse) => {
                if (code != "") {
                    this.codeValid = checkResp.valid;
                    this.errorMarks(checkResp.details);
                    if (this.codeValid) {
                        this.propagateChange(code);
                    } else {
                        let detailsMsgs: string[] = checkResp.details.map(value => value.msg);
                        this.codeInvalidDetails = detailsMsgs.join("\n");
                        this.propagateChange(null); //in invalid case, it propagates a null expression
                    }
                } else {
                    this.codeValid = true; // it's useful to update alert icon on view(manchesterEditorComponent html) when a user deletes all inside editor 
                }
            }
        );
    }

    /**
     * Insert the given text in the position where the cursor is.
     * (this could be useful if it will be added some buttons for adding manchester keyword as AND, OR, ...)
     * @param text
     */
    insertAtCursor(text: string) {
        let cursor = this.cmEditor.getDoc().getCursor();
        this.cmEditor.getDoc().replaceRange(text, cursor, cursor);
    }


    //---- method of ControlValueAccessor and Validator interfaces ----
    /**
     * Write a new value to the element.
     */
    writeValue(obj: string) {
        this.code = obj;
    }
    /**
     * Set the function to be called when the control receives a change event.
     */
    registerOnChange(fn: any): void {
        this.propagateChange = fn;
    }
    /**
     * Set the function to be called when the control receives a touch event. Not used.
     */
    registerOnTouched(fn: any): void { }

    //--------------------------------------------------

    // the method sets in registerOnChange, it is just a placeholder for a method that takes one parameter, 
    // we use it to emit changes back to the parent
    private propagateChange = (_: any) => { };

}

/**
 * Useful to distringuish the context in which the editor is used and consequently which validation to apply
 */
export enum ManchesterCtx {
    datatypeFacets = "datatypeFacets", //the manchester expression describes a datatype restriction with facets
    datatypeEnumeration = "datatypeEnumeration", //the manchester expression describes a datatype restriction with enumerations 
    //default case: the manchester expression describes a class axiom
}

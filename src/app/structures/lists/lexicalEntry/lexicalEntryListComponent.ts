import { ChangeDetectorRef, Component, EventEmitter, Input, Output, QueryList, SimpleChanges, ViewChildren } from "@angular/core";
import { Observable, of } from "rxjs";
import { mergeMap } from 'rxjs/operators';
import { ARTResource, ARTURIResource, RDFResourceRolesEnum, ResAttribute } from "../../../models/ARTResources";
import { LexEntryVisualizationMode, LexicalEntryListPreference, SafeToGo, SafeToGoMap } from "../../../models/Properties";
import { SemanticTurkey } from "../../../models/Vocabulary";
import { OntoLexLemonServices } from "../../../services/ontoLexLemonServices";
import { AuthorizationEvaluator } from "../../../utils/AuthorizationEvaluator";
import { VBRequestOptions } from "../../../utils/HttpManager";
import { ResourceUtils, SortAttribute } from "../../../utils/ResourceUtils";
import { TreeListContext, UIUtils } from "../../../utils/UIUtils";
import { VBActionsEnum } from "../../../utils/VBActions";
import { VBContext } from "../../../utils/VBContext";
import { LexEntryDeleteUndoData, VBEventHandler } from "../../../utils/VBEventHandler";
import { AbstractList } from "../abstractList";
import { LexicalEntryListNodeComponent } from "./lexicalEntryListNodeComponent";

@Component({
    selector: "lexical-entry-list",
    templateUrl: "./lexicalEntryListComponent.html",
    host: { class: "treeListComponent" }
})
export class LexicalEntryListComponent extends AbstractList {

    @ViewChildren(LexicalEntryListNodeComponent) viewChildrenNode: QueryList<LexicalEntryListNodeComponent>;

    @Input() index: string; //initial letter of the entries to show
    @Input() lexicon: ARTURIResource;
    @Output() switchMode = new EventEmitter<LexEntryVisualizationMode>(); //requires to the parent panel to switch mode
    @Output() changeIndexLength = new EventEmitter<number>(); //requires to the parent to change the index length

    structRole = RDFResourceRolesEnum.ontolexLexicalEntry;

    visualizationMode: LexEntryVisualizationMode; //this could be changed dynamically, so each time it is used, get it again from preferences

    private safeToGoLimit: number;
    safeToGo: SafeToGo = { safe: true };
    unsafeIndexOneChar: boolean; //true if in case of safeToGo = false, the current index is 1-char

    translationParam: { count: number, safeToGoLimit: number };

    constructor(private ontolexService: OntoLexLemonServices, eventHandler: VBEventHandler, changeDetectorRef: ChangeDetectorRef) {
        super(eventHandler, changeDetectorRef);
        
        this.eventSubscriptions.push(eventHandler.lexicalEntryCreatedEvent.subscribe(
            (data: { entry: ARTURIResource, lexicon: ARTURIResource }) => {
                if (data.lexicon.getURI() == this.lexicon.getURI()) this.onListNodeCreated(data.entry); 
            } 
        ));
        //here there is no need to check for the index (leading char of the entry) since if the entry uri is not found it is not deleted
        this.eventSubscriptions.push(eventHandler.lexicalEntryDeletedEvent.subscribe(
            (lexEntry: ARTURIResource) => this.onListNodeDeleted(lexEntry)));
        this.eventSubscriptions.push(eventHandler.lexEntryDeletedUndoneEvent.subscribe(
            (data: LexEntryDeleteUndoData) => this.onEntryDeletedUndone(data)
        ));
    }

    ngOnInit() {
        if (!AuthorizationEvaluator.isAuthorized(VBActionsEnum.ontolexGetLexicalEntry)) {
            this.unauthorized = true;
            return;
        }
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['index'] && !changes['index'].firstChange || changes['lexicon'] && !changes['lexicon'].firstChange) {
            this.init();
        }
    }

    initImpl() {
        this.visualizationMode = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences.visualization;
        if (this.visualizationMode == LexEntryVisualizationMode.indexBased && this.index != undefined) {
            this.checkInitializationSafe().subscribe(
                () => {
                    if (this.safeToGo.safe) {
                        UIUtils.startLoadingDiv(this.blockDivElement.nativeElement);
                        this.ontolexService.getLexicalEntriesByAlphabeticIndex(this.index, this.lexicon, VBRequestOptions.getRequestOptions(this.projectCtx)).subscribe(
                            entries => {
                                //sort by show if rendering is active, uri otherwise
                                ResourceUtils.sortResources(entries, this.rendering ? SortAttribute.show : SortAttribute.value);
                                this.list = entries;
                                UIUtils.stopLoadingDiv(this.blockDivElement.nativeElement);
                                if (this.pendingSearchRes) {
                                    this.openListAt(this.pendingSearchRes);
                                }
                            }
                        );
                    }
                }
            );
        } else if (this.visualizationMode == LexEntryVisualizationMode.searchBased) {
            //reset list to empty
            this.forceList(null);
        }
    }

    /**
     * Forces the safeness of the structure even if it was reported as not safe, then re initialize it
     */
    private forceSafeness() {
        this.safeToGo = { safe: true };
        let lexEntryListPreference: LexicalEntryListPreference = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences;
        let safeToGoMap: SafeToGoMap = lexEntryListPreference.safeToGoMap;
        let checksum = this.getInitRequestChecksum();
        safeToGoMap[checksum] = this.safeToGo;
        this.initImpl();
    }

    /**
     * Perform a check in order to prevent the initialization of the structure with too many elements.
     * Update the safeToGo flag and the cached map
     */
    private checkInitializationSafe(): Observable<void> {
        let lexEntryListPreference: LexicalEntryListPreference = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences;
        let safeToGoMap: SafeToGoMap = lexEntryListPreference.safeToGoMap;
        this.safeToGoLimit = lexEntryListPreference.safeToGoLimit;
        this.unsafeIndexOneChar = lexEntryListPreference.indexLength == 1;

        let checksum = this.getInitRequestChecksum();
        
        let safeness: SafeToGo = safeToGoMap[checksum];
        if (safeness != null) { //found safeness in cache
            this.safeToGo = safeness;
            this.translationParam = { count: this.safeToGo.count, safeToGoLimit: this.safeToGoLimit };
            return of(null);
        } else { //never initialized/cahced => count
            UIUtils.startLoadingDiv(this.blockDivElement.nativeElement);
            return this.ontolexService.countLexicalEntriesByAlphabeticIndex(this.index, this.lexicon, VBRequestOptions.getRequestOptions(this.projectCtx)).pipe(
                mergeMap(count => {
                    UIUtils.stopLoadingDiv(this.blockDivElement.nativeElement);
                    safeness = { safe: count < this.safeToGoLimit, count: count };
                    safeToGoMap[checksum] = safeness; //cache the safeness
                    this.safeToGo = safeness;
                    this.translationParam = { count: this.safeToGo.count, safeToGoLimit: this.safeToGoLimit };
                    return of(null);
                })
            );
        }
    }

    private getInitRequestChecksum() {
        let checksum = "lexicon:" + ((this.lexicon != null) ? this.lexicon.toNT() : null) + "&index:" + this.index;
        return checksum;
    }

    public forceList(list: ARTURIResource[]) {
        this.safeToGo = { safe: true }; //prevent the list not showing if a previous index-based initialization set the safeToGo to false
        this.setInitialStatus();
        this.list = list;
    }

    onListNodeCreated(node: ARTURIResource) {
        if (VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences.visualization == LexEntryVisualizationMode.indexBased) {
            if (node.getShow().toLocaleLowerCase().startsWith(this.index.toLocaleLowerCase())) {
                this.list.unshift(node);
                if (this.context == TreeListContext.addPropValue) {
                    this.selectNode(node);
                }
            }
        }
    }

    onListNodeDeleted(node: ARTURIResource) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].getURI() == node.getURI()) {
                if (VBContext.getWorkingProject().isValidationEnabled()) {
                    //replace the resource instead of simply change the graphs, so that the rdfResource detect the change
                    let stagedRes: ARTURIResource = this.list[i].clone();
                    stagedRes.setGraphs([new ARTURIResource(SemanticTurkey.stagingRemoveGraph + VBContext.getWorkingProject().getBaseURI())]);
                    stagedRes.setAdditionalProperty(ResAttribute.EXPLICIT, false);
                    stagedRes.setAdditionalProperty(ResAttribute.SELECTED, false);
                    this.list[i] = stagedRes;
                } else {
                    this.list.splice(i, 1);
                }
                break;
            }
        }
    }

    onResourceCreatedUndone(node: ARTResource) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].equals(node)) {
                this.list.splice(i, 1);
                break;
            }
        }
    }

    onEntryDeletedUndone(data: { resource: ARTURIResource, lexicons: ARTURIResource[] }) {
        if (data.lexicons.some(l => l.equals(this.lexicon))) {
            this.ontolexService.getLexicalEntryIndex(data.resource).subscribe(
                index => {
                    let toAdd: boolean;
                    if (this.index.length == 1) {
                        toAdd = this.index.toLocaleUpperCase() == index[0].toLocaleUpperCase();
                    } else if (this.index.length == 2) {
                        toAdd = index.toLocaleUpperCase() == this.index.toLocaleUpperCase();
                    }
                    if (toAdd) {
                        this.list.push(data.resource);
                    }
                }
            );
        }
    }

    selectNode(node: ARTURIResource) {
        if (this.selectedNode != undefined) {
            this.selectedNode.deleteAdditionalProperty(ResAttribute.SELECTED);
        }
        this.selectedNode = node;
        this.selectedNode.setAdditionalProperty(ResAttribute.SELECTED, true);
        this.nodeSelected.emit(node);
    }


}
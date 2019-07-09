import { Component, Input, QueryList, SimpleChanges, ViewChildren } from "@angular/core";
import { ARTURIResource, RDFResourceRolesEnum, ResAttribute } from "../../../../models/ARTResources";
import { LexEntryVisualizationMode } from "../../../../models/Properties";
import { SemanticTurkey } from "../../../../models/Vocabulary";
import { OntoLexLemonServices } from "../../../../services/ontoLexLemonServices";
import { AuthorizationEvaluator } from "../../../../utils/AuthorizationEvaluator";
import { ResourceUtils, SortAttribute } from "../../../../utils/ResourceUtils";
import { UIUtils } from "../../../../utils/UIUtils";
import { VBActionsEnum } from "../../../../utils/VBActions";
import { VBContext } from "../../../../utils/VBContext";
import { VBEventHandler } from "../../../../utils/VBEventHandler";
import { AbstractList } from "../../../abstractList";
import { LexicalEntryListNodeComponent } from "./lexicalEntryListNodeComponent";
import { VBRequestOptions } from "../../../../utils/HttpManager";

@Component({
    selector: "lexical-entry-list",
    templateUrl: "./lexicalEntryListComponent.html",
    host: { class: "treeListComponent" }
})
export class LexicalEntryListComponent extends AbstractList {

    @ViewChildren(LexicalEntryListNodeComponent) viewChildrenNode: QueryList<LexicalEntryListNodeComponent>;

    @Input() index: string; //initial letter of the entries to show
    @Input() lexicon: ARTURIResource;

    structRole = RDFResourceRolesEnum.ontolexLexicalEntry;

    constructor(private ontolexService: OntoLexLemonServices, eventHandler: VBEventHandler) {
        super(eventHandler);
        
        this.eventSubscriptions.push(eventHandler.lexicalEntryCreatedEvent.subscribe(
            (data: { entry: ARTURIResource, lexicon: ARTURIResource }) => {
                if (data.lexicon.getURI() == this.lexicon.getURI()) this.onListNodeCreated(data.entry); 
            } 
        ));
        //here there is no need to check for the index (leading char of the entry) since if the entry uri is not found it is not deleted
        this.eventSubscriptions.push(eventHandler.lexicalEntryDeletedEvent.subscribe(
            (lexEntry: ARTURIResource) => this.onListNodeDeleted(lexEntry)));
    }

    ngOnInit() {
        if (!AuthorizationEvaluator.isAuthorized(VBActionsEnum.ontolexGetLexicalEntry)) {
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
        if (this.lexicon != undefined) {
            let visualization: LexEntryVisualizationMode = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences.visualization;
            if (visualization == LexEntryVisualizationMode.indexBased && this.index != undefined) {
                this.list = [];
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
            } else if (visualization == LexEntryVisualizationMode.searchBased) {
                //don't do nothing
            }
        }
    }

    public forceList(list: ARTURIResource[]) {
        this.setInitialStatus();
        this.list = list;
    }

    onListNodeCreated(node: ARTURIResource) {
        if (VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().lexEntryListPreferences.visualization = LexEntryVisualizationMode.indexBased) {
            if (node.getShow().toLocaleLowerCase().startsWith(this.index.toLocaleLowerCase())) {
                this.list.unshift(node);
            }
        }
    }

    onListNodeDeleted(node: ARTURIResource) {
        for (var i = 0; i < this.list.length; i++) {
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

    selectNode(node: ARTURIResource) {
        if (this.selectedNode != undefined) {
            this.selectedNode.deleteAdditionalProperty(ResAttribute.SELECTED);
        }
        this.selectedNode = node;
        this.selectedNode.setAdditionalProperty(ResAttribute.SELECTED, true);
        this.nodeSelected.emit(node);
    }

    openListAt(node: ARTURIResource) {
        this.ensureNodeVisibility(node);
        setTimeout( //apply timeout in order to wait that the children node is rendered (in case the openPages has been increased)
            () => {
                var childrenNodeComponent = this.viewChildrenNode.toArray();
                for (var i = 0; i < childrenNodeComponent.length; i++) {
                    if (childrenNodeComponent[i].node.getURI() == node.getURI()) {
                        childrenNodeComponent[i].ensureVisible();
                        if (!childrenNodeComponent[i].node.getAdditionalProperty(ResAttribute.SELECTED)) {
                            childrenNodeComponent[i].selectNode();
                        }
                        break;
                    }
                }
            }
        );
    }


}
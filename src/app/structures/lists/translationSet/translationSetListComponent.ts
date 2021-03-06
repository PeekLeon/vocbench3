import { ChangeDetectorRef, Component, QueryList, ViewChildren } from "@angular/core";
import { OntoLexLemonServices } from "src/app/services/ontoLexLemonServices";
import { ARTResource, ARTURIResource, RDFResourceRolesEnum, ResAttribute } from "../../../models/ARTResources";
import { SemanticTurkey } from "../../../models/Vocabulary";
import { AuthorizationEvaluator } from "../../../utils/AuthorizationEvaluator";
import { ResourceUtils, SortAttribute } from "../../../utils/ResourceUtils";
import { TreeListContext, UIUtils } from "../../../utils/UIUtils";
import { VBActionsEnum } from "../../../utils/VBActions";
import { VBContext } from "../../../utils/VBContext";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { AbstractList } from "../abstractList";
import { TranslationSetListNodeComponent } from "./translationSetListNodeComponent";

@Component({
    selector: "translationset-list",
    templateUrl: "./translationSetListComponent.html",
    host: { class: "treeListComponent" }
})
export class TranslationSetListComponent extends AbstractList {

    @ViewChildren(TranslationSetListNodeComponent) viewChildrenNode: QueryList<TranslationSetListNodeComponent>;

    structRole = RDFResourceRolesEnum.vartransTranslationSet;

    list: ARTURIResource[];

    constructor(private ontolexService: OntoLexLemonServices, eventHandler: VBEventHandler, changeDetectorRef: ChangeDetectorRef) {
        super(eventHandler, changeDetectorRef);
        this.eventSubscriptions.push(eventHandler.translationSetCreatedEvent.subscribe((node: ARTURIResource) => this.onListNodeCreated(node)));
        this.eventSubscriptions.push(eventHandler.translationSetDeletedEvent.subscribe((node: ARTURIResource) => this.onListNodeDeleted(node)));
        this.eventSubscriptions.push(eventHandler.translationSetDeletedUndoneEvent.subscribe((node: ARTURIResource) => this.onDeletedUndo(node)));
    }

    ngOnInit() {
        if (!AuthorizationEvaluator.isAuthorized(VBActionsEnum.datatypesGetDatatype)) {
            this.unauthorized = true;
            return;
        }
        this.init();
    }

    initImpl() {
        UIUtils.startLoadingDiv(this.blockDivElement.nativeElement);
        this.ontolexService.getTranslationSets().subscribe(
            sets => {
                ResourceUtils.sortResources(sets, this.rendering ? SortAttribute.show : SortAttribute.value);
                UIUtils.stopLoadingDiv(this.blockDivElement.nativeElement);
                this.list = <ARTURIResource[]>sets;
            }
        );
    }

    onListNodeCreated(node: ARTURIResource) {
        this.list.unshift(node);
        if (this.context == TreeListContext.addPropValue) {
            this.selectNode(node);
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

    onDeletedUndo(node: ARTURIResource) {
        this.list.push(node);
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
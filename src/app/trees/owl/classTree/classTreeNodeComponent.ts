import { Component, Input, QueryList, ViewChildren } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { ARTURIResource, ResAttribute } from "../../../models/ARTResources";
import { ClassTreeFilter } from "../../../models/Properties";
import { OWL, RDFS } from "../../../models/Vocabulary";
import { ClassesServices } from "../../../services/classesServices";
import { VBRequestOptions } from "../../../utils/HttpManager";
import { ResourceUtils, SortAttribute } from "../../../utils/ResourceUtils";
import { TreeListContext } from "../../../utils/UIUtils";
import { VBContext } from "../../../utils/VBContext";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { SharedModalServices } from "../../../widget/modal/sharedModal/sharedModalServices";
import { AbstractTreeNode } from "../../abstractTreeNode";

@Component({
    selector: "class-tree-node",
    templateUrl: "./classTreeNodeComponent.html",
})
export class ClassTreeNodeComponent extends AbstractTreeNode {

    //ClassTreeNodeComponent children of this Component (useful to open tree for the search)
    @ViewChildren(ClassTreeNodeComponent) viewChildrenNode: QueryList<ClassTreeNodeComponent>;

    @Input() root: boolean = false;
    @Input() filterEnabled: boolean = false;

    private showInstanceNumber: boolean = false;

    constructor(private clsService: ClassesServices, eventHandler: VBEventHandler,
        basicModals: BasicModalServices, sharedModals: SharedModalServices) {
        super(eventHandler, basicModals, sharedModals);
        this.eventSubscriptions.push(eventHandler.subClassCreatedEvent.subscribe(
            (data: any) => this.onChildCreated(data.superClass, data.subClass)));
        this.eventSubscriptions.push(eventHandler.superClassAddedEvent.subscribe(
            (data: any) => this.onParentAdded(data.superClass, data.subClass)));
        this.eventSubscriptions.push(eventHandler.superClassUpdatedEvent.subscribe(
            (data: any) => {
                this.onParentRemoved(data.oldParent, data.child);
                this.onParentAdded(data.newParent, data.child);
            }
        ));
        this.eventSubscriptions.push(eventHandler.classDeletedEvent.subscribe(
            (cls: ARTURIResource) => this.onTreeNodeDeleted(cls)));
        this.eventSubscriptions.push(eventHandler.superClassRemovedEvent.subscribe(
            (data: any) => this.onParentRemoved(data.superClass, data.subClass)));
        this.eventSubscriptions.push(eventHandler.instanceDeletedEvent.subscribe(
            (data: any) => this.onInstanceDeleted(data.cls)));
        this.eventSubscriptions.push(eventHandler.instanceCreatedEvent.subscribe(
            (data: any) => this.onInstanceCreated(data.cls)));
        this.eventSubscriptions.push(eventHandler.typeRemovedEvent.subscribe(
            (data: any) => this.onInstanceDeleted(data.type)));
        this.eventSubscriptions.push(eventHandler.typeAddedEvent.subscribe(
            (data: any) => this.onInstanceCreated(data.type)));

        this.eventSubscriptions.push(eventHandler.classFilterChangedEvent.subscribe(
            () => this.initShowExpandCollapseBtn()
        ));
    }

    ngOnInit() {
        super.ngOnInit();
        //show instance number only if enabled in the preferences and if the node belongs to a tree in TreePanelComponent
        this.showInstanceNumber = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().showInstancesNumber && 
            (this.context == TreeListContext.dataPanel || this.context == TreeListContext.clsIndTree);
        //expand immediately the node if it is a root and if it is owl:Thing or rdfs:Resource
        if ((this.node.getURI() == OWL.thing.getURI() || this.node.getURI() == RDFS.resource.getURI()) && 
            this.root && this.node.getAdditionalProperty(ResAttribute.MORE) == "1") {
            this.expandNode().subscribe();
        }
    }

    expandNodeImpl(): Observable<any> {
        return this.clsService.getSubClasses(this.node, this.showInstanceNumber, VBRequestOptions.getRequestOptions(this.projectCtx)).map(
            subClasses => {
                //sort by show if rendering is active, uri otherwise
                ResourceUtils.sortResources(subClasses, this.rendering ? SortAttribute.show : SortAttribute.value);
                this.children = subClasses;
                this.open = true;
                if (this.children.length == 0) {
                    this.open = false;
                    this.node.setAdditionalProperty(ResAttribute.MORE, 0);
                }
            }
        );
    }

    /**
     * Used to filter out the subclasses of a root class
     * @param subClass 
     */
    private filterOutRootSubClass(subClass: ARTURIResource): boolean {
        let classTreePref = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().classTreePreferences;
        if (this.filterEnabled) {
            return classTreePref.filter.map[this.node.getURI()] != null && 
                classTreePref.filter.map[this.node.getURI()].indexOf(subClass.getURI()) != -1;
        }
    }

    /**
     * The expand/collapse button in the class tree should be visible if:
     * the same condition of the other trees are satisfied 
     * (namely:
     *      - the node has "more" attribute true AND
     *          - "showDeprecated" is true (all children visible)
     *          - or "showDeprecated" is false (only not-deprecated children visible) but there is at least a child not-deprecated 
     * )
     * but in this case it should be taken into account also the sublcass filter. So it should be checked also that there should be
     * at least a child not filtered out (if filter is enabled) and not deprecated (if showDeprecated is false)
     */
    //@Override
    initShowExpandCollapseBtn() {
        let more: boolean = this.node.getAdditionalProperty(ResAttribute.MORE);
        if (more) { //if the more attribute is true, doesn't implies that the button is visible, the node children could be all deprecated
            if (this.children.length > 0) {
                let classTreeFilter: ClassTreeFilter = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().classTreePreferences.filter;
                let childVisible: boolean = false;
                /**
                 * childVisible if: 
                 * showDeprecated true, or child not-deprecated
                 * AND
                 * subClassFilter disabled or child not filtered
                 */
                for (var i = 0; i < this.children.length; i++) {
                    let childFiltered: boolean = classTreeFilter.map[this.node.getURI()] != null && 
                        classTreeFilter.map[this.node.getURI()].indexOf(this.children[i].getURI()) != -1;
                    if ((this.showDeprecated || !this.children[i].isDeprecated()) && (!classTreeFilter.enabled || !childFiltered)) {
                        childVisible = true;
                        break;
                    }
                }
                this.showExpandCollapseBtn = childVisible;
            } else { //no children and "more" true means that the node has not been yet expanded, so in the doubt return true
                this.showExpandCollapseBtn = true;
            }
        } else {
            this.showExpandCollapseBtn = false;
        }

    }

    //EVENT LISTENERS

    //decrease numInst property when an instance of the current class is deleted
    private onInstanceDeleted(cls: ARTURIResource) {
        if (this.node.getURI() == cls.getURI()) {
            var numInst = this.node.getAdditionalProperty(ResAttribute.NUM_INST);
            this.node.setAdditionalProperty(ResAttribute.NUM_INST, numInst - 1);
        }
    }

    //increase numInst property when an instance of the current class is created
    private onInstanceCreated(cls: ARTURIResource) {
        if (this.node.getURI() == cls.getURI()) {
            var numInst = this.node.getAdditionalProperty(ResAttribute.NUM_INST);
            this.node.setAdditionalProperty(ResAttribute.NUM_INST, numInst + 1);
        }
    }

}
import { Component, Input, QueryList, ViewChildren } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { ARTURIResource, ResAttribute, ResourceUtils, SortAttribute } from "../../../models/ARTResources";
import { OWL, RDFS } from "../../../models/Vocabulary";
import { ClassesServices } from "../../../services/classesServices";
import { TreeListContext } from "../../../utils/UIUtils";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { VBProperties } from "../../../utils/VBProperties";
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

    constructor(private clsService: ClassesServices, private pref: VBProperties, eventHandler: VBEventHandler,
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
    }

    ngOnInit() {
        //show instance number only if enabled in the preferences and if the node belongs to a tree in TreePanelComponent
        this.showInstanceNumber = this.pref.getShowInstancesNumber() && (this.context == TreeListContext.dataPanel || this.context == TreeListContext.clsIndTree);
        //expand immediately the node if it is a root and if it is owl:Thing or rdfs:Resource
        if ((this.node.getURI() == OWL.thing.getURI() || this.node.getURI() == RDFS.resource.getURI()) && 
            this.root && this.node.getAdditionalProperty(ResAttribute.MORE) == "1") {
            this.expandNode().subscribe();
        }
    }

    expandNodeImpl(): Observable<any> {
        return this.clsService.getSubClasses(this.node, this.showInstanceNumber).map(
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
        let classTreePref = this.pref.getClassTreePreferences();
        if (this.filterEnabled) {
            return classTreePref.filterMap[this.node.getURI()] != null && 
                classTreePref.filterMap[this.node.getURI()].indexOf(subClass.getURI()) != -1;
        }
            
    }

    /**
     * Tells if the expand/collapse button should be shown according to the class tree filter
     */
    private showExpandCollapseForClassFilter(): boolean {
        let more: boolean = this.node.getAdditionalProperty(ResAttribute.MORE);
        if (more) {
            let classTreePref = this.pref.getClassTreePreferences();
            //if subClass filter is enabled and there is a filter for the children of the given node
            if (this.filterEnabled && classTreePref.filterMap[this.node.getURI()] != null) {
                if (this.children.length > 0) {
                    let childNotFiltered: boolean = false;
                    for (var i = 0; i < this.children.length; i++) { //if there is at least one child not filtered out
                        if (classTreePref.filterMap[this.node.getURI()].indexOf(this.children[i].getURI()) == -1) {
                            return true;
                        }
                    }
                    return false; //all children are filter out => do not show the button
                } else { //no children and "more" true means that the node has not been yet expanded, so in the doubt return true
                    return true;
                }
            } else { //class tree filter disabled
                return true;
            }
        } else {
            return false;
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
import { Component, Input, Output, EventEmitter, ViewChildren, ViewChild, QueryList, ElementRef } from "@angular/core";
import { ARTURIResource, ResAttribute, ResourceUtils } from "../../../models/ARTResources";
import { OWL } from "../../../models/Vocabulary";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { VBPreferences } from "../../../utils/VBPreferences";
import { OwlServices } from "../../../services/owlServices";
import { ClassesServices } from "../../../services/classesServices";
import { AbstractTreeNode } from "../../abstractTreeNode";

@Component({
    selector: "class-tree-node",
    templateUrl: "./classTreeNodeComponent.html",
})
export class ClassTreeNodeComponent extends AbstractTreeNode {

    //ClassTreeNodeComponent children of this Component (useful to open tree for the search)
    @ViewChildren(ClassTreeNodeComponent) viewChildrenNode: QueryList<ClassTreeNodeComponent>;

    constructor(private owlService: OwlServices, private clsService: ClassesServices, private pref: VBPreferences, eventHandler: VBEventHandler) {
        super(eventHandler);
        this.eventSubscriptions.push(eventHandler.subClassCreatedEvent.subscribe(
            (data: any) => this.onChildCreated(data.superClass, data.subClass)));
        this.eventSubscriptions.push(eventHandler.superClassAddedEvent.subscribe(
            (data: any) => this.onParentAdded(data.superClass, data.subClass)));
        this.eventSubscriptions.push(eventHandler.classDeletedEvent.subscribe(
            (cls: ARTURIResource) => this.onTreeNodeDeleted(cls)));
        this.eventSubscriptions.push(eventHandler.superClassRemovedEvent.subscribe(
            (data: any) => this.onParentRemoved(data.cls, data.subClass)));
        this.eventSubscriptions.push(eventHandler.resourceRenamedEvent.subscribe(
            (data: any) => this.onResourceRenamed(data.oldResource, data.newResource)));
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
        if (this.node.getURI() == OWL.thing.getURI() && this.node.getAdditionalProperty(ResAttribute.MORE) == "1") {
            this.expandNode();
        }
    }

    /**
	 * Function called when "+" button is clicked.
	 * Gets a node as parameter and retrieve with an http call the subClass of the node,
	 * then expands the subtree div.
	 */
    expandNode() {
        this.nodeExpandStart.emit();
        this.clsService.getSubClasses(this.node).subscribe(
            subClasses => {
                //sort by show if rendering is active, uri otherwise
                let attribute: "show" | "value" = this.rendering ? "show" : "value";
                ResourceUtils.sortResources(subClasses, attribute);
                this.node.setAdditionalProperty(ResAttribute.CHILDREN, subClasses); //append the retrieved node as child of the expanded node
                this.node.setAdditionalProperty(ResAttribute.OPEN, true);
                this.nodeExpandEnd.emit();
            }
        );
    }

    private showInstNumber(): boolean {
        return this.pref.getShowInstancesNumber();
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
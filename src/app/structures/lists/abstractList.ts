import { ChangeDetectorRef, Directive, ElementRef, QueryList, ViewChild } from "@angular/core";
import { ARTResource, ARTURIResource, ResAttribute } from "../../models/ARTResources";
import { VBEventHandler } from "../../utils/VBEventHandler";
import { AbstractListNode } from "./abstractListNode";
import { AbstractStruct } from "../abstractStruct";

@Directive()
export abstract class AbstractList extends AbstractStruct {

    @ViewChild('blockDivList', { static: true }) public blockDivElement: ElementRef; //the element in the view referenced with #blockDivList
    abstract viewChildrenNode: QueryList<AbstractListNode>;

    protected pendingSearchRes: ARTURIResource; //searched resource that is waiting to be selected once the list is initialized

    /**
     * ATTRIBUTES
     */

    list: any[];

    /**
     * CONSTRUCTOR
     */
    protected changeDetectorRef: ChangeDetectorRef;
    constructor(eventHandler: VBEventHandler, changeDetectorRef: ChangeDetectorRef) {
        super(eventHandler);
        this.changeDetectorRef = changeDetectorRef;
        this.eventSubscriptions.push(this.eventHandler.resourceCreatedUndoneEvent.subscribe(
            (node: ARTURIResource) => this.onResourceCreatedUndone(node)
        ));
    }

    /**
     * METHODS
     */

    init() {
        this.setInitialStatus();
        this.initImpl();
    }

    abstract initImpl(): void;

    setInitialStatus() {
        this.list = [];
        this.selectedNode = null;
        this.nodeSelected.emit(this.selectedNode);
        this.checkedNodes = [];
        this.nodeChecked.emit(this.checkedNodes);
        this.nodeLimit = this.initialNodes;
        this.unauthorized = false;
    }

    /**
     * type of the node param depends on the list implementation
     * (for example in instance list it is an object with individual and its class, in scheme list it is simply the scheme)
     */
    abstract selectNode(node: any): void;
    abstract onListNodeCreated(node: ARTURIResource): void;
    abstract onListNodeDeleted(node: ARTURIResource): void;
    abstract onResourceCreatedUndone(node: ARTResource): void;

    openListAt(node: ARTURIResource) {
        this.ensureNodeVisibility(node);
        this.changeDetectorRef.detectChanges(); //wait that the children node is rendered (in case the openPages has been increased)
        let childrenNodeComponent = this.viewChildrenNode.toArray();
        for (let i = 0; i < childrenNodeComponent.length; i++) {
            if (childrenNodeComponent[i].node.equals(node)) {
                childrenNodeComponent[i].ensureVisible();
                if (!childrenNodeComponent[i].node.getAdditionalProperty(ResAttribute.SELECTED)) {
                    childrenNodeComponent[i].selectNode();
                }
                break;
            }
        }
    }

    //Nodes limitation management
    initialNodes: number = 150;
    nodeLimit: number = this.initialNodes;
    increaseRate: number = this.initialNodes / 5;
    onScroll() {
        let scrollElement: HTMLElement = this.scrollableElement.nativeElement;
        // if (scrollElement.scrollTop === (scrollElement.scrollHeight - scrollElement.offsetHeight)) {
        //consider a little buffer of 2px in order to prevent potential problems (see https://stackoverflow.com/a/32283147/5805661)
        if (Math.abs(scrollElement.scrollHeight - scrollElement.offsetHeight - scrollElement.scrollTop) < 2) {
            //bottom reached => increase max range if there are more roots to show
            if (this.nodeLimit < this.list.length) {
                this.nodeLimit += this.increaseRate;
            }
        }
    }
    ensureNodeVisibility(resource: ARTURIResource) {
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].equals(resource)) {
                if (i >= this.nodeLimit) {
                    //update nodeLimit so that node at index i is within the range
                    let scrollStep: number = ((i - this.nodeLimit) / this.increaseRate) + 1;
                    this.nodeLimit += this.increaseRate * scrollStep;
                }
                this.pendingSearchRes = null; //if there was any pending search, reset it
                return; //node found and visible
            }
        }
        //if this code is reached, the node is not found (so probably it is waiting that the list is initialized)
        this.pendingSearchRes = resource;
    }

}
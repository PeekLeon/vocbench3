import { Component, Input, Output, EventEmitter, ViewChildren, ViewChild, QueryList, ElementRef } from "@angular/core";
import { PropertyServices } from "../../../services/propertyServices";
import { ARTURIResource, ResAttribute } from "../../../utils/ARTResources";
import { VBEventHandler } from "../../../utils/VBEventHandler";

@Component({
    selector: "property-tree-node",
    templateUrl: "./propertyTreeNodeComponent.html",
})
export class PropertyTreeNodeComponent {
    @Input() node: ARTURIResource;
    @Output() nodeSelected = new EventEmitter<ARTURIResource>();
    @Output() nodeExpandStart = new EventEmitter<any>(); //emit an event when the user click on button to expand a subTree of a node
    @Output() nodeExpandEnd = new EventEmitter<any>(); //emit an event when the subTree expansion is completed

    //get an element in the view referenced with #treeNodeElement (useful to apply scrollIntoView in the search function)
    @ViewChild('treeNodeElement') treeNodeElement: ElementRef;
    //PropertyTreeNodeComponent children of this Component (useful to open tree for the search)
    @ViewChildren(PropertyTreeNodeComponent) viewChildrenNode: QueryList<PropertyTreeNodeComponent>;
    //structure to support the tree opening
    private pendingSearch: any = {
        pending: false, //tells if there is a pending search waiting that children view are initialized 
        path: [], //remaining path of the tree to open
    }

    private eventSubscriptions: any[] = [];

    constructor(private propService: PropertyServices, private eventHandler: VBEventHandler) {
        this.eventSubscriptions.push(eventHandler.subPropertyCreatedEvent.subscribe(
            (data: any) => this.onSubPropertyCreated(data.subProperty, data.superProperty)));
        this.eventSubscriptions.push(eventHandler.superPropertyAddedEvent.subscribe(
            (data: any) => this.onSuperPropertyAdded(data.subProperty, data.superProperty)));
        this.eventSubscriptions.push(eventHandler.propertyDeletedEvent.subscribe(
            (property: ARTURIResource) => this.onPropertyDeleted(property)));
        this.eventSubscriptions.push(eventHandler.superPropertyRemovedEvent.subscribe(
            (data: any) => this.onSuperPropertyRemoved(data.property, data.superProperty)));
        this.eventSubscriptions.push(eventHandler.resourceRenamedEvent.subscribe(
            (data: any) => this.onResourceRenamed(data.oldResource, data.newResource)));
    }

    ngAfterViewInit() {
        //when PropertyTreeNodeComponent children are added, looks for a pending search to resume
        this.viewChildrenNode.changes.subscribe(
            c => {
                if (this.pendingSearch.pending) {//there is a pending search
                    /* setTimeout to trigger a new round of change detection avoid an exception due to changes in a lifecycle hook
                    (see https://github.com/angular/angular/issues/6005#issuecomment-165911194) */
                    window.setTimeout(() =>
                        this.expandPath(this.pendingSearch.path)
                    );
                }
            }
        );
    }

    ngOnDestroy() {
        this.eventHandler.unsubscribeAll(this.eventSubscriptions);
    }

    /**
     * Expand recursively the given path untill the final node.
     * If the given path is empty then the current node is the searched one, otherwise
     * the current node expands itself (if is closed), looks among its children for the following node of the path,
     * then call recursively expandPath() for the child node.
     */
    public expandPath(path: ARTURIResource[]) {
        if (path.length == 0) { //this is the last node of the path. Focus it in the tree
            this.treeNodeElement.nativeElement.scrollIntoView();
            //not sure if it has to be selected (this method could be used in some scenarios where there's no need to select the node)
            if (!this.node.getAdditionalProperty(ResAttribute.SELECTED)) { //select the searched node only if is not yet selected
                this.selectNode();
            }
        } else {
            if (!this.node.getAdditionalProperty(ResAttribute.OPEN)) { //if node is close, expand itself
                this.expandNode();
            }
            var nodeChildren = this.viewChildrenNode.toArray();

            if (nodeChildren.length == 0) {//Still no children PropertyTreeNodeComponent (view not yet initialized)
                //save pending search so it can resume when the children are initialized
                this.pendingSearch.pending = true;
                this.pendingSearch.path = path;
            } else if (this.pendingSearch.pending) {
                //the tree expansion is resumed, reset the pending search
                this.pendingSearch.pending = false;
                this.pendingSearch.path = [];
            }
            for (var i = 0; i < nodeChildren.length; i++) {//for every PropertyTreeNodeComponent child
                if (nodeChildren[i].node.getURI() == path[0].getURI()) { //look for the next node of the path
                    //let the child node expand the remaining path
                    path.splice(0, 1);
                    nodeChildren[i].expandPath(path);
                    break;
                }
            }
        }
    }

    /**
 	 * Function called when "+" button is clicked.
 	 * Gets a node as parameter and retrieve with an http call the narrower of the node,
 	 * then expands the subtree div.
 	 */
    public expandNode() {
        this.nodeExpandStart.emit();
        this.propService.getSubProperties(this.node).subscribe(
            subProps => {
                this.node.setAdditionalProperty(ResAttribute.CHILDREN, subProps); //append the retrieved node as child of the expanded node
                this.node.setAdditionalProperty(ResAttribute.OPEN, true);
                this.nodeExpandEnd.emit();
            }
        );
    }

    /**
   	 * Function called when "-" button is clicked.
   	 * Collapse the subtree div.
   	 */
    private collapseNode() {
        this.node.setAdditionalProperty(ResAttribute.OPEN, false);
        this.node.setAdditionalProperty(ResAttribute.CHILDREN, []);
    }

    /**
     * Called when a node in the tree is clicked. This function emit an event 
     */
    private selectNode() {
        this.nodeSelected.emit(this.node);
    }

    //EVENT LISTENERS

    private onNodeSelected(node: ARTURIResource) {
        this.nodeSelected.emit(node);
    }

    private onPropertyDeleted(property: ARTURIResource) {
        var children = this.node.getAdditionalProperty(ResAttribute.CHILDREN);
        for (var i = 0; i < children.length; i++) {
            if (children[i].getURI() == property.getURI()) {
                children.splice(i, 1);
                //if node has no more children change info of node so the UI will update
                if (children.length == 0) {
                    this.node.setAdditionalProperty(ResAttribute.MORE, 0);
                    this.node.setAdditionalProperty(ResAttribute.OPEN, false);
                }
                break;
            }
        }
    }

    private onSubPropertyCreated(subProperty: ARTURIResource, superProperty: ARTURIResource) {
        //add the new property as children only if the parent is the current property
        if (this.node.getURI() == superProperty.getURI()) {
            this.node.getAdditionalProperty(ResAttribute.CHILDREN).push(subProperty);
            this.node.setAdditionalProperty(ResAttribute.MORE, 1);
            this.node.setAdditionalProperty(ResAttribute.OPEN, true);
        }
    }

    private onSuperPropertyAdded(subProperty: ARTURIResource, superProperty: ARTURIResource) {
        if (this.node.getURI() == superProperty.getURI()) {//if the superProperty is the current node
            this.node.setAdditionalProperty(ResAttribute.MORE, 1); //update more
            //if it was open add the subProperty to the visible children
            if (this.node.getAdditionalProperty(ResAttribute.OPEN)) {
                this.node.getAdditionalProperty(ResAttribute.CHILDREN).push(subProperty);
            }
        }
    }

    private onSuperPropertyRemoved(property: ARTURIResource, superProperty: ARTURIResource) {
        if (superProperty.getURI() == this.node.getURI()) {
            this.onPropertyDeleted(property);
        }
    }

    private onResourceRenamed(oldResource: ARTURIResource, newResource: ARTURIResource) {
        if (oldResource.getURI() == this.node.getURI()) {
            this.node[ResAttribute.SHOW] = newResource.getShow();
            this.node['uri'] = newResource.getURI();
        }
    }

}
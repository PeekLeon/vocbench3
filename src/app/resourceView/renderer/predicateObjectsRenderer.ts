import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ARTNode, ARTPredicateObjects, ARTResource, ARTURIResource, ResAttribute } from "../../models/ARTResources";
import { Language } from "../../models/LanguagesCountries";
import { AddAction, ResViewPartition, ResViewUtils } from "../../models/ResourceView";
import { AuthorizationEvaluator } from "../../utils/AuthorizationEvaluator";
import { ResourceUtils } from "../../utils/ResourceUtils";

@Component({
    selector: "pred-obj-renderer",
    templateUrl: "./predicateObjectsRenderer.html"
})
export class PredicateObjectsRenderer {

    /**
     * INPUTS / OUTPUTS
     */

    @Input('pred-obj') predicateObjects: ARTPredicateObjects;
    @Input() resource: ARTResource; //resource described
    @Input() readonly: boolean;
    @Input() rendering: boolean;
    @Input() partition: ResViewPartition;
    @Output() add: EventEmitter<AddAction> = new EventEmitter<AddAction>();
    @Output() remove: EventEmitter<ARTNode> = new EventEmitter<ARTResource>(); //if the event doesn't contain the node, it means "delete all"
    @Output() edit: EventEmitter<ARTNode> = new EventEmitter<ARTResource>(); //require the parent partition renderer to edit the value
    @Output() update = new EventEmitter();
    @Output('copyLocale') copyLocaleOutput = new EventEmitter<{ value: ARTNode, locales: Language[] }>(); //forward the event copyLocale from editable-resource
    @Output() dblclickObj: EventEmitter<ARTResource> = new EventEmitter<ARTResource>();

    /**
     * ATTRIBUTES
     */

    /**
     * METHODS
     */

    /**
     * Should allow to enrich a property by opening a modal and selecting a value.
     * This is fired when the add button is clicked (the one placed on the groupPanel outline) without property parameter,
     * or hen the "+" button of a specific property panel is clicked (placed in the subPanel heading) with the property provided.
     * If property is provided (add fired from specific property panel) the modal won't allow to change it allowing so
     * to enrich just that property, otherwise, if property is not provided (add fired from the generic partition panel),
     * the modal allow to change property to enrich.
     * @param predicate property to enrich.
     */
    private addValue() {
        this.add.emit(AddAction.default);
    }
    private isAddManuallyAllowed() {
        return ResViewUtils.addManuallyPartition.indexOf(this.partition) != -1;
    }
    private addManually() {
        this.add.emit(AddAction.manually);
    }
    private addExternalValue() {
        this.add.emit(AddAction.remote);
    }
    private isAddExteranlResourceAllowed() {
        return ResViewUtils.addExternalResourcePartition.indexOf(this.partition) != -1;
    }
    /**
     * Removes an object related to the given predicate.
     * This is fired when the "-" button is clicked (near an object).
     */
    private removeValue(object: ARTNode) {
        this.remove.emit(object);
    }
    private removeAllValues() {
        this.remove.emit();
    }
    /**
     * Fired when the edit menu item is clicked (only for some partitions)
     */
    private editValue(object: ARTNode) {
        this.edit.emit(object);
    }
    /**
     * Returns the title of the "+" button placed in a subPanel heading.
     * This is specific of a predicate of a partition, so it depends from a predicate.
     */
    private getAddPropImgTitle(predicate: ARTURIResource): string {
        return "Add a " + predicate.getShow();
    }
    /**
     * Returns the title of the "-" button placed near an object in a subPanel body.
     * This is specific of a predicate of a partition, so it depends from a predicate.
     */
    private getRemovePropImgTitle(predicate: ARTURIResource): string {
        return "Remove " + predicate.getShow();
    }
    /**
     * Fired when the object is updated
     */
    private onObjectUpdate() {
        this.update.emit();
    }
    /**
     * Fired when an object in a subPanel is double clicked. It should simply emit a objectDblClick event.
     */
    private objectDblClick(obj: ARTNode) {
        if (obj.isResource()) {//emit double click only for resources (not for ARTLiteral that cannot be described in a ResView)
            this.dblclickObj.emit(<ARTResource>obj);
        }
    }
    /**
     * 
     * @param languages 
     * @param obj 
     */
    private copyLocales(locales: Language[], obj: ARTNode) {
        this.copyLocaleOutput.emit({ value: obj, locales: locales });
    }

    /**
     * Tells if the given object need to be rendered as reifiedResource or as simple rdfResource.
     * A resource should be rendered as reifiedResource if the predicate has custom range and the object
     * is an ARTBNode or an ARTURIResource (so a reifiable object). Otherwise, if the object is a literal
     * or the predicate has no custom range, the object should be rendered as simple rdfResource
     * @param object object of the predicate object list to render in view.
     */
    private renderAsReified(predicate: ARTURIResource, object: ARTNode) {
        return (
            predicate.getAdditionalProperty(ResAttribute.HAS_CUSTOM_RANGE) && object.isResource() && 
            !object.getAdditionalProperty(ResAttribute.NOT_REIFIED)
        );
    }

    /**
     * Determines if the add button is disabled
     */
    private isAddDisabled() {
        /**
         * Add disabled if one of them is true
         * - resource is not explicit (e.g. imported or inferred) but not in staging add at the same time (addition in staging add is allowed)
         * - ResView is working in readonly mode
         * - user not authorized
         */
        return (
            (!this.resource.getAdditionalProperty(ResAttribute.EXPLICIT) && !ResourceUtils.isResourceInStagingAdd(this.resource)) ||
            this.readonly || !AuthorizationEvaluator.ResourceView.isAddAuthorized(this.partition, this.resource)
        );
    }

    private isDeleteDisabled() {
        /**
         * Delete disabled if one of them is true
         * - resource is not explicit (e.g. imported, inferred, in staging)
         * - resource is in a staging status (staging-add or staging-remove)
         * - ResView is working in readonly mode
         * - user not authorized
         */
        return (
            !this.resource.getAdditionalProperty(ResAttribute.EXPLICIT) ||
            ResourceUtils.isResourceInStaging(this.resource) ||
            this.readonly || !AuthorizationEvaluator.ResourceView.isRemoveAuthorized(this.partition, this.resource)
        );
    }

    private isActionMenuDisabled() {
        //menu disabled if all of its action are disabled
        return this.isAddDisabled() && this.isDeleteDisabled();
    }

    // PAGING
    private pagingLimit: number = 10;
    private limitActive: boolean = true;
    private showObject(index: number) {
        return !this.limitActive || (index < this.pagingLimit);
    }
    private showAllButton() {
        return this.limitActive && (this.pagingLimit < this.predicateObjects.getObjects().length);
    }
    private showAll() {
        this.limitActive = false;
    }


}
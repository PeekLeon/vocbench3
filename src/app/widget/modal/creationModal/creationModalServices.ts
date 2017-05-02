import { Injectable } from '@angular/core';
import { Modal, BSModalContextBuilder } from 'angular2-modal/plugins/bootstrap';
import { OverlayConfig } from 'angular2-modal';
import { ARTURIResource } from "../../../models/ARTResources";
import { NewResourceModal, NewResourceModalData } from "./newResourceModal/newResourceModal";
import { NewResourceCfModal, NewResourceCfModalData } from "./newResourceModal/newResourceCfModal";
import { NewSkosResourceCfModal, NewSkosResourceCfModalData } from "./newResourceModal/newSkosResourceCfModal";
import { NewPlainLiteralModal, NewPlainLiteralModalData } from "./newPlainLiteralModal/newPlainLiteralModal";
import { NewTypedLiteralModal, NewTypedLiteralModalData } from "./newTypedLiteralModal/newTypedLiteralModal";

@Injectable()
export class CreationModalServices {

    constructor(private modal: Modal) { }

    /**
     * Opens a modal to create a new resource with name, label and language tag
     * @param title the title of the modal dialog
     * @param lang the selected default language in the lang-picker of the modal. If not provided, set the default VB language
     * @return if the modal closes with ok returns a promise containing an object with uri, label and lang
     */
    newResource(title: string, lang?: string) {
        var modalData = new NewResourceModalData(title, lang);
        const builder = new BSModalContextBuilder<NewResourceModalData>(
            modalData, undefined, NewResourceModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewResourceModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

    /**
     * Opens a modal to create a new resource with uri plus custom form supplement fields
     * @param title the title of the modal dialog
     * @param cfId the custom form id
     * @return if the modal closes with ok returns a promise containing an object {uriResource:ARTURIResource, cfValueMap:any}
     */
    newResourceCf(title: string, cfId?: string) {
        var modalData = new NewResourceCfModalData(title, cfId);
        const builder = new BSModalContextBuilder<NewResourceCfModalData>(
            modalData, undefined, NewResourceCfModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewResourceCfModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

    /**
     * Opens a modal to create a new skos resource with label, language and uri (optional), plus custom form supplement fields
     * @param title the title of the modal dialog
     * @param cfId the custom form id
     * @param lang the selected default language in the lang-picker of the modal. If not provided, set the default VB language
     * @return if the modal closes with ok returns a promise containing an object {uriResource:ARTURIResource, label:ARTLiteral, cfValueMap:any}
     */
    newSkosResourceCf(title: string, cls: ARTURIResource, cfId?: string, lang?: string) {
        var modalData = new NewSkosResourceCfModalData(title, cls, cfId, lang);
        const builder = new BSModalContextBuilder<NewSkosResourceCfModalData>(
            modalData, undefined, NewSkosResourceCfModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewSkosResourceCfModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

    /**
     * Opens a modal to create a new literal with language tag
     * @param title the title of the modal dialog
     * @param value the value inserted by default
     * @param valueReadonly if true the input field is disable and cannot be changed
     * @param lang the language selected as default
     * @param langReadonly if true the language selection is disable and language cannot be changed
     * @return if the modal closes with ok returns a promise containing an object with value and lang
     */
    newPlainLiteral(title: string, value?: string, valueReadonly?: boolean, lang?: string, langReadonly?: boolean) {
        var modalData = new NewPlainLiteralModalData(title, value, valueReadonly, lang, langReadonly);
        const builder = new BSModalContextBuilder<NewPlainLiteralModalData>(
            modalData, undefined, NewPlainLiteralModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewPlainLiteralModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

    /**
     * Opens a modal to create a new literal with datatype
     * @param title the title of the modal dialog
     * @param allowedDatatypes datatypes allowed in the datatype selection list
     * @return if the modal closes with ok returns a promise containing an object with value and datatype
     */
    newTypedLiteral(title: string, allowedDatatypes?: string[]) {
        var modalData = new NewTypedLiteralModalData(title, allowedDatatypes);
        const builder = new BSModalContextBuilder<NewTypedLiteralModalData>(
            modalData, undefined, NewTypedLiteralModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewTypedLiteralModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

}
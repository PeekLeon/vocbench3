import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CustomFormModal } from 'src/app/customForms/customForm/customFormModal';
import { ModalOptions } from 'src/app/widget/modal/Modals';
import { ARTBNode, ARTNode, ARTResource, ARTURIResource } from '../../../models/ARTResources';
import { Language } from '../../../models/LanguagesCountries';
import { AddManuallyValueModal } from "./addManuallyValueModal";
import { AddPropertyValueModal } from "./addPropertyValueModal";
import { BrowseExternalResourceModal } from './browseExternalResourceModal';
import { ClassListCreatorModal } from "./classListCreatorModal";
import { ConstituentListCreatorModal } from './constituentListCreatorModal';
import { CopyLocalesModal } from './copyLocalesModal';
import { DataRangeEditorModal } from "./dataRangeEditorModal";
import { DataTypeRestrictionsModal } from './datatypeRestrictionsModal';
import { InstanceListCreatorModal } from "./instanceListCreatorModal";
import { PropertyChainCreatorModal } from './propertyChainCreatorModal';
import { RdfsMembersModal } from './rdfsMembersModal';

/**
 * Service to open modals that allow to create a classes list or instances list
 */
@Injectable()
export class ResViewModalServices {

    constructor(private modalService: NgbModal) { }

    /**
     * Opens a modal to create a list of classes (useful for class axioms)
     * @param title the title of the modal
     * @return if the modal closes with ok returns a promise containing an array of 
     * classes (ARTURIResource) and expressions (ARTBNode)
     */
    createClassList(title: string) {
        const modalRef: NgbModalRef = this.modalService.open(ClassListCreatorModal, new ModalOptions('lg'));
        modalRef.componentInstance.title = title;
        return modalRef.result;
    }

    /**
     * Opens a modal to create a list of instance (useful for class axioms)
     * @param title the title of the modal
     * @return if the modal closes with ok returns a promise containing an array of instances
     */
    createInstanceList(title: string) {
        const modalRef: NgbModalRef = this.modalService.open(InstanceListCreatorModal, new ModalOptions('lg'));
        modalRef.componentInstance.title = title;
        return modalRef.result;
    }

    createPropertyChain(title: string, property: ARTURIResource, propChangeable?: boolean, chain?: ARTBNode) {
        const modalRef: NgbModalRef = this.modalService.open(PropertyChainCreatorModal, new ModalOptions('lg'));
        modalRef.componentInstance.title = title;
		modalRef.componentInstance.property = property;
        if (propChangeable != null) modalRef.componentInstance.propChangeable = propChangeable;
        if (chain != null) modalRef.componentInstance.chain = chain;
        return modalRef.result;
    }

    /**
     * Opens a modal with a custom form to enrich a property with a custom range.
     * @param title title of the dialog
     * @param cfId custom form ID
     * @param language optional language that if provided "suggests" to initialize each lang-picker to it
     */
    enrichCustomForm(title: string, cfId: string, language?: string) {
        const modalRef: NgbModalRef = this.modalService.open(CustomFormModal, new ModalOptions());
        modalRef.componentInstance.title = title;
		modalRef.componentInstance.cfId = cfId;
		if (language != null) modalRef.componentInstance.language = language;
        return modalRef.result;
    }

    /**
     * Opens a modal that allows to select a property and add a value to it.
     * Returns and object containing "property" and "value".
     * @param title title of the dialog
     * @param resource resource that is going to enrich with the property-value pair.
     * @param property property that the modal should allow to enrich
     * @param propChangeable tells whether the input property can be changed exploring the properties subtree.
     *  If false, the button to change property is hidden. Default is true
     * @param rootProperty root property that, in case propChangeable is true, the modal should show as root of the property change when changing
     * @param allowMultiselection tells whether the multiselection in the tree/list is allowed. Default is true. (some scenario may
     * require to disable the multiselection, like the addFirst/After...() in oreded collection).
     */
    addPropertyValue(title: string, resource: ARTResource, property: ARTURIResource, propChangeable?: boolean, rootProperty?: ARTURIResource, allowMultiselection?: boolean) {
        const modalRef: NgbModalRef = this.modalService.open(AddPropertyValueModal, new ModalOptions());
        modalRef.componentInstance.title = title;
		modalRef.componentInstance.resource = resource;
        modalRef.componentInstance.property = property;
        if (propChangeable != null) modalRef.componentInstance.propChangeable = propChangeable;
		if (rootProperty != null) modalRef.componentInstance.rootPropertyInput = rootProperty;
		if (allowMultiselection != null) modalRef.componentInstance.allowMultiselection = allowMultiselection;
        return modalRef.result;
    }

    /**
     * 
     * @param property 
     * @param propChangeable 
     */
    addManualValue(property: ARTURIResource, propChangeable?: boolean) {
        const modalRef: NgbModalRef = this.modalService.open(AddManuallyValueModal, new ModalOptions());
        modalRef.componentInstance.property = property;
		if (propChangeable != null) modalRef.componentInstance.propChangeable = propChangeable;
        return modalRef.result;
    }

    /**
     * 
     * @param property 
     * @param propChangeable 
     */
    addRdfsMembers(property: ARTURIResource, propChangeable?: boolean) {
        const modalRef: NgbModalRef = this.modalService.open(RdfsMembersModal, new ModalOptions());
        modalRef.componentInstance.property = property;
		if (propChangeable != null) modalRef.componentInstance.propChangeable = propChangeable;
        return modalRef.result;
    }

    /**
     * 
     * @param title 
     */
    createConstituentList(title: string) {
        const modalRef: NgbModalRef = this.modalService.open(ConstituentListCreatorModal, new ModalOptions('lg'));
        modalRef.componentInstance.title = title;
        return modalRef.result;
    }

    /**
     * Opens a modal that allows to edit an existing datarange
     * @param datarangeNode node that represents the datarange
     */
    editDataRange(datarangeNode: ARTBNode) {
        const modalRef: NgbModalRef = this.modalService.open(DataRangeEditorModal, new ModalOptions());
        modalRef.componentInstance.datarangeNode = datarangeNode;
        return modalRef.result;
    }

    /**
     * 
     * @param title 
     * @param property 
     * @param propChangeable 
     */
    browseExternalResource(title: string, property?: ARTURIResource, propChangeable?: boolean) {
        const modalRef: NgbModalRef = this.modalService.open(BrowseExternalResourceModal, new ModalOptions());
        modalRef.componentInstance.title = title;
		if (property != null) modalRef.componentInstance.property = property;
		if (propChangeable != null) modalRef.componentInstance.propChangeable = propChangeable;
        return modalRef.result;
    }

    /**
     * 
     * @param value 
     * @param locales 
     */
    copyLocale(value: ARTNode, locales: Language[]) {
        const modalRef: NgbModalRef = this.modalService.open(CopyLocalesModal, new ModalOptions());
        modalRef.componentInstance.value = value;
		modalRef.componentInstance.localesInput = locales;
        return modalRef.result;
    }

    /**
     * @param title 
     * @param datatype the datatype to which add/edit the restriction
     * @param restriction if provided, represents the restriction to edit
     */
    setDatatypeFacets(title: string, datatype: ARTURIResource, restriction?: ARTBNode) {
        const modalRef: NgbModalRef = this.modalService.open(DataTypeRestrictionsModal, new ModalOptions());
        modalRef.componentInstance.title = title;
		modalRef.componentInstance.datatype = datatype;
		if (restriction != null) modalRef.componentInstance.restriction = restriction;
        return modalRef.result;
    }

}
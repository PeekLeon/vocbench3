import { Component, ElementRef, Input } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ManchesterExprModalReturnData } from "src/app/widget/modal/sharedModal/manchesterExprModal/manchesterExprModal";
import { ARTBNode, ARTResource, ARTURIResource, RDFResourceRolesEnum, ResAttribute } from '../../../models/ARTResources';
import { ManchesterServices } from "../../../services/manchesterServices";
import { UIUtils } from "../../../utils/UIUtils";
import { SharedModalServices } from "../../../widget/modal/sharedModal/sharedModalServices";

@Component({
    selector: "class-list-creator-modal",
    templateUrl: "./classListCreatorModal.html",
})
export class ClassListCreatorModal {
    @Input() title: string;

    selectedTreeClass: ARTURIResource; //class selected in the class tree
    selectedListElement: ARTResource; //class or expression selected in the class list
    classList: Array<ARTResource> = []; //classes (ARTURIResource) or expression (ARTBNode)

    duplicateResource: ARTResource; //resource tried to add to the classList but already there 

    constructor(public activeModal: NgbActiveModal, public manchService: ManchesterServices,
        private sharedModals: SharedModalServices, private elementRef: ElementRef) {
    }

    ngAfterViewInit() {
        UIUtils.setFullSizeModal(this.elementRef);
    }

    /**
     * Adds a class of the class tree to the list of classes to return
     */
    addClassToList() {
        //check if the class is already in the list
        for (let i = 0; i < this.classList.length; i++) {
            if (this.classList[i].getNominalValue() == this.selectedTreeClass.getNominalValue()) {
                this.duplicateResource = this.classList[i];
                return;
            }
        }
        //push a copy of the selected class in tree to avoid problem with "selected" attribute
        let cls = new ARTURIResource(
            this.selectedTreeClass.getURI(), this.selectedTreeClass.getShow(), this.selectedTreeClass.getRole());
        cls.setAdditionalProperty(ResAttribute.EXPLICIT, this.selectedTreeClass.getAdditionalProperty(ResAttribute.EXPLICIT));
        this.classList.push(cls);
        this.duplicateResource = null;
    }

    /**
     * Validates the manchester expression and then adds it to the classList
     */
    addExpressionToList() {
        this.sharedModals.manchesterExpression({ key: "DATA.ACTIONS.ADD_MANCHESTER_EXPRESSION" }).then(
            (data: ManchesterExprModalReturnData) => {
                //check if the expression is already in the list
                for (let i = 0; i < this.classList.length; i++) {
                    if (this.classList[i].getShow() == data.expression) {
                        this.duplicateResource = this.classList[i];
                        return;
                    }
                }
                //adds the expression as ARTBNode to the list 
                let exprCls = new ARTBNode(data.expression, data.expression, RDFResourceRolesEnum.cls);
                exprCls.setAdditionalProperty(ResAttribute.EXPLICIT, true);
                this.classList.push(exprCls);
                this.duplicateResource = null;
            },
            () => { }
        );
    }

    /**
     * Removes a class or an expression from the list of classes to return
     */
    removeFromList() {
        this.classList.splice(this.classList.indexOf(this.selectedListElement), 1);
        this.selectedListElement = null;
        this.duplicateResource = null;
    }

    /**
     * Listener to the event nodeSelected thrown by the class-tree. Updates the selectedTreeClass
     */
    onTreeClassSelected(cls: ARTURIResource) {
        this.selectedTreeClass = cls;
    }

    /**
     * Listener to click on element in the classes list. Updates the selectedListElement
     */
    onListElementSelected(element: ARTResource) {
        this.selectedListElement = element;
    }

    /**
     * Returns true if the given element is the current selectedListElement. Useful in the view to apply
     * style to the selected element in the classes list
     */
    isListElementSelected(element: ARTResource) {
        return this.selectedListElement == element;
    }

    ok() {
        this.activeModal.close(this.classList);
    }

    cancel() {
        this.activeModal.dismiss();
    }

}
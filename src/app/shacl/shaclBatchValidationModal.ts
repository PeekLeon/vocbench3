import { Component, ElementRef, ViewChild } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ProjectServices } from "../services/projectServices";
import { ShaclServices } from "../services/shaclServices";
import { UIUtils } from "../utils/UIUtils";
import { VBContext } from "../utils/VBContext";
import { BasicModalServices } from "../widget/modal/basicModal/basicModalServices";

@Component({
    selector: "shacl-batch-validation-modal",
    templateUrl: "./shaclBatchValidationModal.html",
})
export class ShaclBatchValidationModal {

    @ViewChild('blockingDiv', { static: true }) private blockingDivElement: ElementRef;

    validationOnCommitEnabled: boolean;

    validationResult: string;

    constructor(public activeModal: NgbActiveModal, private shaclService: ShaclServices,
        private basicModals: BasicModalServices) {
    }

    startValidation() {
        UIUtils.startLoadingDiv(this.blockingDivElement.nativeElement);
        this.shaclService.batchValidation().subscribe(
            result => {
                UIUtils.stopLoadingDiv(this.blockingDivElement.nativeElement);
                this.validationResult = result;
            }
        );
    }

    ok() {
        this.activeModal.close();
    }

    cancel() {
        this.activeModal.dismiss();
    }

}
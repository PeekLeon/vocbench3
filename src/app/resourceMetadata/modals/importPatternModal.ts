import { Component, Input } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalType } from 'src/app/widget/modal/Modals';
import { PatternStruct } from "../../models/ResourceMetadata";
import { BasicModalServices } from "../../widget/modal/basicModal/basicModalServices";

@Component({
    selector: "import-pattern-modal",
    templateUrl: "./importPatternModal.html",
})
export class ImportPatternModal {
    @Input() title: string;
    @Input() existingPatterns: PatternStruct[];

    name: string;
    private file: File;

    constructor(public activeModal: NgbActiveModal, private basicModals: BasicModalServices) {
    }

    fileChangeEvent(file: File) {
        this.file = file;
    }

    isDataValid(): boolean {
        return this.file != null && this.name != null && this.name.trim() != "";
    }

    ok() {
        if (this.existingPatterns.some(p => p.name == this.name)) {
            this.basicModals.alert({key:"STATUS.WARNING"}, "A Metadata Pattern with the same already exists. Please change the name and retry", ModalType.warning);
            return;
        }
        this.activeModal.close({ file: this.file, name: this.name });
    }

    cancel() {
        this.activeModal.dismiss();
    }



}
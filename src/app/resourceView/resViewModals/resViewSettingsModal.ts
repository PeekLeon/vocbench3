import { Component } from "@angular/core";
import { DialogRef, ModalComponent } from "ngx-modialog";
import { BSModalContext } from 'ngx-modialog/plugins/bootstrap';

@Component({
    selector: "res-view-settings-modal",
    templateUrl: "./resViewSettingsModal.html",
})
export class ResViewSettingsModal implements ModalComponent<BSModalContext> {
    context: BSModalContext;

    constructor(public dialog: DialogRef<BSModalContext>) {
        this.context = dialog.context;
    }

    ngOnInit() {
    }

    ok(event: Event) {
        event.stopPropagation();
        event.preventDefault();
        this.dialog.close();
    }

}
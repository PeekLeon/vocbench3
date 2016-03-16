import {Component, ViewChild} from "angular2/core";
import {ModalServices} from "../widget/modal/modalServices";

@Component({
    selector: "test-component",
    templateUrl: "app/src/test/testComponent.html",
    host: { class : "pageComponent" }
})
export class TestComponent {
    
    private typeList = ["info", "error", "warning"];
    
    constructor(public modalService: ModalServices) {}
    
    private confirmResult;
    private confirmTitle = "Confirm";
    private confirmMessage = "Are you sure to continue?";
    private confirmType = "info";
    
    confirm() {
        this.modalService.confirm(this.confirmTitle, this.confirmMessage, this.confirmType).then(
            result => {
                this.confirmResult = "Yes"
            },
            () => this.confirmResult = "No"
        );
    }

    
    private promptResult;
    private promptTitle = "What's your name?";
    private promptLabel = "Name";

    prompt() {
        this.modalService.prompt(this.promptTitle, this.promptLabel).then(
            result => {
                this.promptResult = result;
            },
            () => this.promptResult = null
        );
    }
    
    private alertTitle = "Alert";
    private alertMessage = "Operation completed";
    private alertType = "info";
    
    alert() {
        this.modalService.alert(this.alertTitle, this.alertMessage, this.alertType);
    }
    
    
    private newResourceResult;
    private newResourceTitle = "Create new resource";
    
    newResource() {
        this.modalService.newResource(this.newResourceTitle).then(
            result => {
                this.newResourceResult = result;
            },
            () => this.newResourceResult = null
        );
    }
    
    private newLiteralLangResult;
    private newLiteralLangTitle = "Create new label";
    
    newLiteralLang() {
        this.modalService.newLiteralLang(this.newLiteralLangTitle).then(
            result => {
                this.newLiteralLangResult = result;
            },
            () => this.newLiteralLangResult = null
        );
    }
    
}
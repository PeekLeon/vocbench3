import { Component, ViewChild, ElementRef } from "@angular/core";
import { BSModalContext } from 'angular2-modal/plugins/bootstrap';
import { DialogRef, ModalComponent } from "angular2-modal";
import { AbstractCustomConstructorModal } from "./abstractCustomConstructorModal"
import { CustomFormsServices } from "../../../../services/customFormsServices"
import { BasicModalServices } from "../../basicModal/basicModalServices"
import { BrowsingModalServices } from "../../browsingModal/browsingModalServices"
import { ARTLiteral, ARTURIResource } from "../../../../models/ARTResources"
import { SKOS } from "../../../../models/Vocabulary"

export class NewConceptCfModalData extends BSModalContext {
    constructor(
        public title: string = "Modal title",
        public broader: ARTURIResource,
        public clsChangeable: boolean = true,
        public lang: string
    ) {
        super();
    }
}

@Component({
    selector: "new-concept-cf-modal",
    templateUrl: "./newConceptCfModal.html",
})
export class NewConceptCfModal extends AbstractCustomConstructorModal implements ModalComponent<NewConceptCfModalData> {
    context: NewConceptCfModalData;

    @ViewChild("toFocus") inputToFocus: ElementRef;

    //standard form
    private label: string;
    private lang: string;
    private uri: string;
    private schemes: ARTURIResource[];

    constructor(public dialog: DialogRef<NewConceptCfModalData>, cfService: CustomFormsServices,
        basicModals: BasicModalServices, browsingModals: BrowsingModalServices) {
        super(cfService, basicModals, browsingModals);
        this.context = dialog.context;
        console.log("constructor newConcept");
    }

    ngOnInit() {
        this.lang = this.context.lang;
        this.resourceClass = SKOS.concept;
        this.selectCustomForm();
        console.log("onInit newConcept");
    }

    ngAfterViewInit() {
        this.inputToFocus.nativeElement.focus();
    }

    private onLangChange(newLang: string) {
        this.lang = newLang;
    }

    private onSchemesChanged(schemes: ARTURIResource[]) {
        this.schemes = schemes;
    }

    changeClass() {
        this.changeClassWithRoot(SKOS.concept);
    }

    isStandardFormDataValid(): boolean {
        return (this.label != undefined && this.label.trim() != "" &&
            this.schemes != null && this.schemes.length > 0);
    }

    ok(event: Event) {
        event.stopPropagation();
        event.preventDefault();

        var entryMap: any = this.collectCustomFormData();

        var returnedData: { uriResource: ARTURIResource, label: ARTLiteral, cls: ARTURIResource, schemes: ARTURIResource[], cfId: string, cfValueMap: any} = {
            uriResource: null,
            label: new ARTLiteral(this.label, null, this.lang),
            cls: this.resourceClass,
            schemes: this.schemes,
            cfId: this.customFormId,
            cfValueMap: entryMap
        }
        //Set URI only if localName is not empty
        if (this.uri != null && this.uri.trim() != "") {
            returnedData.uriResource = new ARTURIResource(this.uri);
        }
        this.dialog.close(returnedData);
    }

    cancel() {
        this.dialog.dismiss();
    }

}
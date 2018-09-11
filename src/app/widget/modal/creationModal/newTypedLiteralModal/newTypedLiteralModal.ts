import { Component } from "@angular/core";
import { DialogRef, ModalComponent } from "ngx-modialog";
import { BSModalContext } from 'ngx-modialog/plugins/bootstrap';
import { ARTLiteral, ARTURIResource, ResourceUtils } from "../../../../models/ARTResources";
import { XmlSchema, RDF } from "../../../../models/Vocabulary";
import { VBContext } from "../../../../utils/VBContext";

export class NewTypedLiteralModalData extends BSModalContext {

    /**
     * @param allowedDatatypes array of datatype URIs of the allowed datatypes in the typed literal creation.
     * If null all the datatypes are allowed
     */
    constructor(
        public title: string = 'Create new label',
        public allowedDatatypes: Array<ARTURIResource>,
        public dataRanges: Array<ARTLiteral[]>
    ) {
        super();
    }
}

@Component({
    selector: "new-typed-lang-modal",
    templateUrl: "./newTypedLiteralModal.html",
})
export class NewTypedLiteralModal implements ModalComponent<NewTypedLiteralModalData> {
    context: NewTypedLiteralModalData;

    private showAspectSelector: boolean = false;
    private typedLiteralAspectSelector: string = "Typed literal";
    private dataRangeAspectSelector: string = "DataRange";
    private aspectSelectors: string[] = [this.typedLiteralAspectSelector, this.dataRangeAspectSelector];
    private selectedAspectSelector: string = this.aspectSelectors[0];

    private datatype: ARTURIResource;
    private value: ARTLiteral;
    private notValidatableType: boolean = false;

    private selectedDataRange: ARTLiteral[]; //selected list of dataranges among which chose one
    private selectedDrValue: ARTLiteral; //Value selected among those available in the selectedDataRange

    private submitted: boolean = false;

    constructor(public dialog: DialogRef<NewTypedLiteralModalData>) {
        this.context = dialog.context;
    }

    ngOnInit() {
        if (this.context.allowedDatatypes != null && this.context.dataRanges != null) {
            this.showAspectSelector = true;
            this.selectedDataRange = this.context.dataRanges[0];
        } else if (this.context.allowedDatatypes != null) {
            this.selectedAspectSelector = this.typedLiteralAspectSelector;
        } else if (this.context.dataRanges != null) {
            this.selectedAspectSelector = this.dataRangeAspectSelector;
            this.selectedDataRange = this.context.dataRanges[0];
        } else { //both allowedDatatypes and dataRanges null
            this.selectedAspectSelector = this.typedLiteralAspectSelector;
        }

    }

    private getDataRangePreview(dataRange: ARTLiteral[]): string {
        var preview: string = "OneOf: [";
        for (var i = 0; i < dataRange.length; i++) {
            let v: ARTLiteral = dataRange[i];
            preview += JSON.stringify(v.getValue());
            preview += "^^" + ResourceUtils.getQName(v.getDatatype(), VBContext.getPrefixMappings());
            preview += ", "
            if (i == 2 && dataRange.length > 3) { //stops the preview at the third element (if there are more)
                preview += "...";
                break;
            }
        }
        preview += "]";
        return preview;
    }

    private isInputValid(): boolean {
        var valid: boolean = false;
        if (this.value != undefined) {
            if (this.selectedAspectSelector == this.typedLiteralAspectSelector) {
                let dt = this.value.getDatatype();
                let stringValue: any = this.value.getValue();
                if (dt == XmlSchema.byte.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue <= 127 && stringValue >= -128;
                } else if (dt == XmlSchema.float.getURI()) {
                    valid = new RegExp("^[\-\+]?[0-9]+(\.[0-9]+)?$").test(stringValue);
                } else if (dt == XmlSchema.int.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= -2147483648 && stringValue <= 2147483647;
                } else if (dt == XmlSchema.integer.getURI()) {
                    valid = new RegExp("^[\-\+]?[0-9]+$").test(stringValue);
                } else if (dt == XmlSchema.language.getURI()) {
                    valid = new RegExp("^([a-zA-Z]{1,8})(-[a-zA-Z0-9]{1,8})*$").test(stringValue);
                } else if (dt == XmlSchema.long.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= -9223372036854775808 && stringValue <= 9223372036854775807;
                } else if (dt == XmlSchema.nonNegativeInteger.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 0;
                } else if (dt == XmlSchema.nonPositiveInteger.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue <= 0;
                } else if (dt == XmlSchema.negativeInteger.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue <= -1;
                } else if (dt == XmlSchema.positiveInteger.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 1;
                } else if (dt == XmlSchema.short.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= -32768 && stringValue <= 32767;
                } else if (dt == XmlSchema.string.getURI()) {
                    valid = stringValue.trim() != "";// if value is string, it's valid only if is not an empty string
                } else if (dt == XmlSchema.unsignedByte.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 0 && stringValue <= 255;
                } else if (dt == XmlSchema.unsignedInt.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 0 && stringValue <= 4294967295;
                } else if (dt == XmlSchema.unsignedLong.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 0 && stringValue <= 18446744073709551615;
                } else if (dt == XmlSchema.unsignedShort.getURI()) {
                    valid = new RegExp("[\-+]?[0-9]+").test(stringValue) && stringValue >= 0 && stringValue <= 65535;
                } else { //every other datatype doesn't require validation
                    valid = true;
                }
            } else if (this.selectedAspectSelector == this.dataRangeAspectSelector) {
                if (this.selectedDrValue != null) {
                    valid = true;
                }
            }
        }
        return valid;
    }

    private onDatatypeChange(datatype: ARTURIResource) {
        this.datatype = datatype;
        this.notValidatableType = !(
            this.datatype.getURI() == RDF.langString.getURI() ||
            this.datatype.getURI() == XmlSchema.byte.getURI() ||
            this.datatype.getURI() == XmlSchema.decimal.getURI() ||
            this.datatype.getURI() == XmlSchema.double.getURI() ||
            this.datatype.getURI() == XmlSchema.float.getURI() ||
            this.datatype.getURI() == XmlSchema.int.getURI() ||
            this.datatype.getURI() == XmlSchema.integer.getURI() ||
            this.datatype.getURI() == XmlSchema.long.getURI() ||
            this.datatype.getURI() == XmlSchema.negativeInteger.getURI() ||
            this.datatype.getURI() == XmlSchema.nonNegativeInteger.getURI() ||
            this.datatype.getURI() == XmlSchema.nonPositiveInteger.getURI() ||
            this.datatype.getURI() == XmlSchema.positiveInteger.getURI() ||
            this.datatype.getURI() == XmlSchema.short.getURI() ||
            this.datatype.getURI() == XmlSchema.unsignedByte.getURI() ||
            this.datatype.getURI() == XmlSchema.unsignedInt.getURI() ||
            this.datatype.getURI() == XmlSchema.unsignedLong.getURI() ||
            this.datatype.getURI() == XmlSchema.unsignedShort.getURI() ||
            this.datatype.getURI() == XmlSchema.boolean.getURI() ||
            this.datatype.getURI() == XmlSchema.date.getURI() ||
            this.datatype.getURI() == XmlSchema.dateTime.getURI() ||
            this.datatype.getURI() == XmlSchema.string.getURI() ||
            this.datatype.getURI() == XmlSchema.time.getURI()
        );
    }

    ok(event: Event) {
        this.submitted = true;
        if (this.isInputValid()) {
            if (this.selectedAspectSelector == this.typedLiteralAspectSelector) {
                this.dialog.close(this.value);
            } else if (this.selectedAspectSelector == this.dataRangeAspectSelector) {
                this.dialog.close(this.selectedDrValue);
            }
        }
    }

    cancel() {
        this.dialog.dismiss();
    }

}
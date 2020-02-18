import { Component } from "@angular/core";
import { BSModalContext, BSModalContextBuilder } from 'ngx-modialog/plugins/bootstrap';
import { DialogRef, ModalComponent, Modal, OverlayConfig } from "ngx-modialog";
import { SignaturePickerModal, SignaturePickerModalData } from "./signaturePickerModal";
import { CODAServices } from "../../../../services/codaServices"
import { ConverterContractDescription, ConverterUtils, SignatureDescription, ParameterDescription, RDFCapabilityType } from "../../../../models/Coda";

export class ConverterPickerModalData extends BSModalContext {
    /**
     * @param title modal title
     * @param message modal message, if null no the message is shwown the modal
     * @param capabilities list of admitted capabilities of converter to show
     */
    constructor(
        public title: string = 'Modal Title',
        public message: string,
        public capabilities: RDFCapabilityType[]
    ) {
        super();
    }
}

/**
 * Modal that allows to choose among a set of options
 */
@Component({
    selector: "converter-picker-modal",
    templateUrl: "./converterPickerModal.html",
})
export class ConverterPickerModal implements ModalComponent<ConverterPickerModalData> {
    context: ConverterPickerModalData;
    
    private converters: ConverterContractDescription[];
    private selectedConverter: ConverterContractDescription;
    private selectedConverterType: RDFCapabilityType; //uri/literal
    private concerterTypeConstrained: boolean = false; //if true disable the selection of converter type (uri/literal) when available
    private selectedSignature: SignatureDescription;

    private projectionOperator: string = "";
    
    constructor(public dialog: DialogRef<ConverterPickerModalData>, private modal: Modal, private codaService: CODAServices) {
        this.context = dialog.context;
    }

    ngOnInit() {
        this.codaService.listConverterContracts().subscribe(
            converterList => {
                if (this.context.capabilities != null && this.context.capabilities.length != 0) {
                    if (this.context.capabilities.indexOf(RDFCapabilityType.node) != -1) {
                        this.converters = converterList;
                    } else {
                        //=> filter for capability, show only converters compliant with given capabilities
                        this.converters = [];
                        converterList.forEach((conv: ConverterContractDescription) => {
                            let capab: RDFCapabilityType = conv.getRDFCapability();
                            if (capab == RDFCapabilityType.node) {
                                this.converters.push(conv);
                            } else if (capab == RDFCapabilityType.uri) {
                                if (this.context.capabilities.indexOf(RDFCapabilityType.uri) != -1) {
                                    this.converters.push(conv);
                                }
                            } else if (capab == RDFCapabilityType.literal) {
                                if (this.context.capabilities.indexOf(RDFCapabilityType.literal) != -1) {
                                    this.converters.push(conv);
                                }
                            }
                        });
                    }
                } else {
                    //=> do not filter, show all converters
                    this.converters = converterList;
                }
            }
        );
        /**
         * selection of converter type constrained if:
         * allowed capabilities are only literal (no node or uri) => constrained to literal
         * allowed capabilities is only uri (no other capabilities) => constrained to uri
         */
        if (this.context.capabilities != null &&
            ((this.context.capabilities.length > 0 && this.context.capabilities.indexOf(RDFCapabilityType.node) == -1 && this.context.capabilities.indexOf(RDFCapabilityType.uri) == -1 ) ||
            (this.context.capabilities.length == 1 && this.context.capabilities[0] == RDFCapabilityType.uri))
         ) {
            this.concerterTypeConstrained = true;
        }
    }

    private selectConverter(converter: ConverterContractDescription) {
        if (converter != this.selectedConverter) {
            this.selectedConverter = converter;
            if (this.selectedConverter.getRDFCapability() == RDFCapabilityType.literal ||
                (this.selectedConverter.getRDFCapability() == RDFCapabilityType.node && 
                this.context.capabilities != null && this.context.capabilities.length > 0 && 
                this.context.capabilities.indexOf(RDFCapabilityType.node) == -1 && this.context.capabilities.indexOf(RDFCapabilityType.uri) == -1)
            ) {
                this.selectedConverterType = RDFCapabilityType.literal;
            } else { //'node' or 'uri'
                this.selectedConverterType = RDFCapabilityType.uri;
            }
            //set as selected signature the one with less parameters
            var signatures = this.selectedConverter.getSignatures();
            this.selectedSignature = signatures[0];
            for (var i = 1; i < signatures.length; i++) {
                if (signatures[i].getParameters().length < this.selectedSignature.getParameters().length) {
                    this.selectedSignature = signatures[i];
                }
            }
            this.updateProjectionOperator();
        }
    }

    private chooseSignature() {
        var modalData = new SignaturePickerModalData("Choose the signature for " + this.selectedConverter.getName(), null,
            this.selectedConverter.getSignatures(), this.selectedSignature);
        const builder = new BSModalContextBuilder<SignaturePickerModalData>(
            modalData, undefined, SignaturePickerModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(27).toJSON() };
        return this.modal.open(SignaturePickerModal, overlayConfig).result.then(
            (signature: SignatureDescription) => {
                this.selectedSignature = signature;
                this.updateProjectionOperator();
            },
            () => {}
        );
    }

    private isSignatureEditable(): boolean {
        if (this.selectedConverter != null) {
            /* For each signatures check if it has at least a parameter
             * if every signature doesn't have any parameters it should not allow
             * to choose between the signatures (since the converter doesn't take arguments) */
            let signatures: SignatureDescription[] = this.selectedConverter.getSignatures();
            //just 1 signature => there's no need to select which one to choose, the eventual params are filled in updateProjectionOperator
            if (signatures.length == 1) {
                return false;
            }
            for (var i = 0; i < signatures.length; i++) {
                if (signatures[i].getParameters().length > 0) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    private updateProjectionOperator() {
        this.projectionOperator = ConverterUtils.getConverterProjectionOperator(this.selectedConverter, this.selectedSignature, this.selectedConverterType);
    }

    private switchConverterType(convType: RDFCapabilityType) {
        this.selectedConverterType = convType;
        this.updateProjectionOperator();
    }

    ok(event: Event) {
        event.stopPropagation();
        this.dialog.close({
            projectionOperator: this.projectionOperator,
            contractDesctiption: this.selectedConverter
        });
    }

    cancel() {
        this.dialog.dismiss();
    }
}
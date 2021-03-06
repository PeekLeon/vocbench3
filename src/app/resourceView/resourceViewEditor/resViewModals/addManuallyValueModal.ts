import { Component, Input } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalType } from 'src/app/widget/modal/Modals';
import { ARTNode, ARTURIResource } from "../../../models/ARTResources";
import { NTriplesUtil, ResourceUtils } from "../../../utils/ResourceUtils";
import { VBContext } from "../../../utils/VBContext";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../widget/modal/browsingModal/browsingModalServices";

@Component({
    selector: "add-manual-modal",
    templateUrl: "./addManuallyValueModal.html",
})
export class AddManuallyValueModal {
    @Input() property: ARTURIResource;
    @Input() propChangeable: boolean = true;

    private rootProperty: ARTURIResource; //root property of the partition that invoked this modal
    enrichingProperty: ARTURIResource;

    inputTxt: string;


    constructor(public activeModal: NgbActiveModal, private browsingModals: BrowsingModalServices, private basicModals: BasicModalServices) { }

    ngOnInit() {
        this.rootProperty = this.property;
        this.enrichingProperty = this.rootProperty;
    }

    changeProperty() {
        this.browsingModals.browsePropertyTree({ key: "DATA.ACTIONS.SELECT_PROPERTY" }, [this.rootProperty]).then(
            (selectedProp: any) => {
                this.enrichingProperty = selectedProp;
            },
            () => { }
        );
    }

    ok() {
        let value: ARTNode;
        try {
            if (this.inputTxt.startsWith("<") && this.inputTxt.endsWith(">")) { //uri
                value = NTriplesUtil.parseURI(this.inputTxt);
            } else if (this.inputTxt.startsWith("_:")) { //bnode
                value = NTriplesUtil.parseBNode(this.inputTxt);
            } else if (this.inputTxt.startsWith("\"")) { //literal
                value = NTriplesUtil.parseLiteral(this.inputTxt);
            } else if (ResourceUtils.isQName(this.inputTxt, VBContext.getPrefixMappings())) { //qname
                value = ResourceUtils.parseQName(this.inputTxt, VBContext.getPrefixMappings());
            } else {
                throw new Error("Not a valid N-Triples representation: " + this.inputTxt);
            }
        } catch (err) {
            this.basicModals.alert({ key: "STATUS.INVALID_DATA" }, err, ModalType.error);
            return;
        }
        this.activeModal.close({ value: value, property: this.enrichingProperty });
    }

    cancel() {
        this.activeModal.dismiss();
    }

    onEnter() {
        if (this.isInputValid()) {
            this.ok();
        }
    }

    isInputValid(): boolean {
        return (this.inputTxt != undefined && this.inputTxt.trim() != "");
    }

}
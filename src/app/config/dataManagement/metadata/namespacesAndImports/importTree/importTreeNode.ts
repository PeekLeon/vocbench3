import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Modal, BSModalContextBuilder } from 'angular2-modal/plugins/bootstrap';
import { OverlayConfig } from 'angular2-modal';
import { ImportOntologyModal, ImportOntologyModalData } from "../importOntologyModal";
import { MetadataServices } from "../../../../../services/metadataServices";
import { OntologyImport, ImportType } from "../../../../../models/Metadata";
import { UIUtils } from "../../../../../utils/UIUtils";

@Component({
    selector: "import-tree-node",
    templateUrl: "./importTreeNode.html",
})
export class ImportTreeNodeComponent {
    @Input() import: OntologyImport;
    @Output() nodeRemoved = new EventEmitter<OntologyImport>();
    @Output() update = new EventEmitter();

    private open: boolean = true;

    constructor(private metadataService: MetadataServices, private modal: Modal) { }

    private removeImport() {
        this.nodeRemoved.emit(this.import);
    }

    private repairFromLocalFile() {
        this.openImportModal("Repair failed import from local file", ImportType.fromLocalFile).then(
            (data: any) => {
                UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
                this.metadataService.getFromLocalFile(data.baseURI, data.localFile, data.mirrorFile, data.transitiveImportAllowance).subscribe(
                    stResp => {
                        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                        this.update.emit();
                    }
                )
            },
            () => { }
        );
    }

    private repairFromWeb() {
        this.openImportModal("Repair failed import from web", ImportType.fromWeb).then(
            (data: any) => {
                UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
                this.metadataService.downloadFromWeb(data.baseURI, data.transitiveImportAllowance, data.altURL, data.rdfFormat).subscribe(
                    stResp => {
                        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                        this.update.emit();
                    }
                )
            },
            () => { }
        );
    }

    private repairFromWebToMirror() {
        this.openImportModal("Repair failed import from web to mirror", ImportType.fromWebToMirror).then(
            (data: any) => {
                UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
                this.metadataService.downloadFromWebToMirror(
                    data.baseURI, data.mirrorFile, data.transitiveImportAllowance, data.altURL, data.rdfFormat).subscribe(
                    stResp => {
                        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                        this.update.emit();
                    }
                )
            },
            () => { }
        );
    }

    /**
     * Opens a modal to import an ontology
     * @param title the title of the modal
     * @param importType tells the type of the import. On this parameter depends the input fields of the modal.
     * Available values: fromWeb, fromWebToMirror, fromLocalFile, fromOntologyMirror
     * @return returned object depends on importType. If importType is:
     * fromWeb) object contains "baseURI", "altURL" and "rdfFormat";
     * fromWebToMirror) object contains "baseURI", "mirrorFile", "altURL" and "rdfFormat";
     * fromLocalFile) object contains "baseURI", "localFile" and "mirrorFile";
     * fromOntologyMirror) mirror object contains "namespace" and "file".
     */
    private openImportModal(title: string, importType: ImportType) {
        var modalData = new ImportOntologyModalData(title, importType);
        const builder = new BSModalContextBuilder<ImportOntologyModalData>(
            modalData, undefined, ImportOntologyModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(ImportOntologyModal, overlayConfig).then(
            dialog => dialog.result
        );
    }

    private onNodeRemoved(node: OntologyImport) {
        this.nodeRemoved.emit(node);
    }

    private onUpdate() {
        this.update.emit();
    }

}
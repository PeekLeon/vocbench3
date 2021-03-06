import { Component, Input } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ImportType, OntologyMirror, TransitiveImportMethodAllowance, TransitiveImportUtils } from "../../models/Metadata";
import { RDFFormat } from "../../models/RDFFormat";
import { ExportServices } from "../../services/exportServices";
import { OntoManagerServices } from "../../services/ontoManagerServices";

@Component({
    selector: "import-ontology-modal",
    templateUrl: "./importOntologyModal.html",
})
export class ImportOntologyModal {
    @Input() title: string;
    @Input() importType: ImportType; //'fromWeb' | 'fromWebToMirror' | 'fromLocalFile' | 'fromOntologyMirror'
    @Input() baseUriInput?: string; //baseURI of the imported ontology (provided only when repairing)

    private editorMode: EditorMode = EditorMode.import;

    private baseURIOptional: boolean;
    private baseURICheck: boolean; //used for type "fromLocalFile" (its value is computed in the method ngOnInit())
    private baseURI: string; //used for type "fromWeb", "fromWebToMirror", "fromLocalFile"

    private localFile: File; //used for type "fromLocalFile"

    private mirrorFileOptional: boolean;
    private mirrorFileCheck: boolean; //used for type "fromWebToMirror", "fromLocalFile" (its value is computed in the method ngOnInit())
    private mirrorFile: string; //used for type "fromWebToMirror", "fromLocalFile"

    private altURLCheck: boolean = false; //used for type "fromWeb", "fromWebToMirror"
    private altURL: string; //used for type "fromWeb", "fromWebToMirror"

    private forceFormatCheck: boolean = false; //used for type "fromWeb", "fromWebToMirror"
    private formats: RDFFormat[];
    private rdfFormat: RDFFormat; //used for type "fromWeb", "fromWebToMirror"

    private mirrorList: OntologyMirror[]; //used for type "fromOntologyMirror"
    private selectedMirror: OntologyMirror; //used for type "fromOntologyMirror"

    importAllowances: { allowance: TransitiveImportMethodAllowance, showTranslationKey: string }[] = TransitiveImportUtils.importAllowancesList;
    selectedImportAllowance: TransitiveImportMethodAllowance = this.importAllowances[1].allowance;

    constructor(public activeModal: NgbActiveModal, public ontoMgrService: OntoManagerServices, public exportService: ExportServices) {
    }

    ngOnInit() {
        //init mirror list if modal import type is fromOntologyMirror
        if (this.importType == ImportType.fromOntologyMirror) {
            this.ontoMgrService.getOntologyMirror().subscribe(
                mirrors => {
                    this.mirrorList = mirrors;
                }
            );
        }
        //init list of rdfFormats if import type is fromWeb or fromWebToMirror
        if (this.importType == ImportType.fromWeb || this.importType == ImportType.fromWebToMirror) {
            this.exportService.getOutputFormats().subscribe(
                formats => {
                    this.formats = formats;
                    //select RDF/XML as default
                    for (let i = 0; i < this.formats.length; i++) {
                        if (this.formats[i].name == "RDF/XML") {
                            this.rdfFormat = this.formats[i];
                            return;
                        }
                    }
                }
            );
        }
        if (this.baseUriInput != null) {
            this.editorMode = EditorMode.repair;
            this.baseURI = this.baseUriInput;
        }
        //baseURI is always mandatory, except in import from local file
        this.baseURIOptional = this.editorMode == EditorMode.import && this.importType == ImportType.fromLocalFile;
        //mirror file is mandatory in import fromMirror, fromWebToMirror and in repair fromWebToMirror. Optional in import and repair fromLocalFile
        this.mirrorFileOptional = this.importType == ImportType.fromLocalFile;
    }

    fileChangeEvent(file: File) {
        this.localFile = file;
    }

    isOkClickable() {
        /* 
        in the following checks, selectedImportAllowance is never checked since (even it is mandatory) it is automatically set through the combobox.
        Moreover, some checks may be the same for both import and repair (e.g. in fromWeb or fromWebToMirror), 
        but I prefer to keep them separated (using if-else clause) so if the optional/mandatory parameters changes for the given scenario, 
        it will be easier to fix the conditions.
        */
        if (this.importType == ImportType.fromWeb) {
            if (this.editorMode == EditorMode.import) { 
                //baseURI required, other params optional
                return this.baseURI != null && this.baseURI.trim() != "" && //baseURI valid
                    (!this.altURLCheck || this.altURL != null && this.altURL.trim() != "") && //altURL not checked, or checked and valid
                    (!this.forceFormatCheck || this.rdfFormat != null); //format not checked or checked and selected
            } else { //repair
                //baseURI required, other params optional
                return this.baseURI != null && this.baseURI.trim() != "" && //baseURI valid
                    (!this.altURLCheck || this.altURL != null && this.altURL.trim() != "") && //altURL not checked, or checked and valid
                    (!this.forceFormatCheck || this.rdfFormat != null); //format not checked or checked and selected
            }
        } else if (this.importType == ImportType.fromWebToMirror) {
            if (this.editorMode == EditorMode.import) { 
                //baseURI and mirrorFile required, other params optional
                return this.baseURI != null && this.baseURI.trim() != "" && //baseURI valid
                    this.mirrorFile != null && this.mirrorFile.trim() != "" && //mirrorFile valid
                    (!this.altURLCheck || this.altURL != null && this.altURL.trim() != "") && //altURL not checked, or checked and valid
                    (!this.forceFormatCheck || this.rdfFormat != null); //format not checked or checked and selected
            } else {
                //baseURI and mirrorFile required, other params optional
                return this.baseURI != null && this.baseURI.trim() != "" && //baseURI valid
                    this.mirrorFile != null && this.mirrorFile.trim() != "" && //mirrorFile valid
                    (!this.altURLCheck || this.altURL != null && this.altURL.trim() != "") && //altURL not checked, or checked and valid
                    (!this.forceFormatCheck || this.rdfFormat != null); //format not checked or checked and selected
            }
        } else if (this.importType == ImportType.fromLocalFile) {
            if (this.editorMode == EditorMode.import) { 
                //local file required, other param optional
                return this.localFile != null && //localFile provided
                    (!this.baseURICheck || this.baseURI != null && this.baseURI.trim() != "") && //baseURI not checked, or checked and valid
                    (!this.mirrorFileCheck || this.mirrorFile != null && this.mirrorFile.trim() != ""); //mirrorFile not checked, or checked and valid
            } else {
                //baseURI and localFile required, other optional
                return this.baseURI != null && this.baseURI.trim() != "" && //baseURI valid
                    this.localFile != null && //localFile provided
                    (!this.mirrorFileCheck || this.mirrorFile != null && this.mirrorFile.trim() != ""); //mirrorFile not checked, or checked and valid
            }
        } else if (this.importType == ImportType.fromOntologyMirror) {
            //available only import (not repair)
            //baseURI and mirror required (both from selectedMirror)
            return this.selectedMirror != null;
        }
    }

    ok() {
        if (this.importType == ImportType.fromWeb) {
            if (this.editorMode == EditorMode.import) { 
                let returnData: ImportFromWebData = {
                    baseURI: this.baseURI,
                    altURL: this.altURLCheck ? this.altURL : null,
                    rdfFormat: this.forceFormatCheck ? this.rdfFormat : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            } else { //repair
                let returnData: RepairFromWebData = {
                    baseURI: this.baseURI,
                    altURL: this.altURLCheck ? this.altURL : null,
                    rdfFormat: this.forceFormatCheck ? this.rdfFormat : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            }
        } else if (this.importType == ImportType.fromWebToMirror) {
            if (this.editorMode == EditorMode.import) { 
                let returnData: ImportFromWebToMirrorData = {
                    baseURI: this.baseURI,
                    altURL: this.altURLCheck ? this.altURL : null,
                    mirrorFile: this.mirrorFile,
                    rdfFormat: this.forceFormatCheck ? this.rdfFormat : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            } else { //repair
                let returnData: RepairFromWebToMirrorData = {
                    baseURI: this.baseURI,
                    altURL: this.altURLCheck ? this.altURL : null,
                    mirrorFile: this.mirrorFile,
                    rdfFormat: this.forceFormatCheck ? this.rdfFormat : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            }
        } else if (this.importType == ImportType.fromLocalFile) {
            if (this.editorMode == EditorMode.import) { 
                let returnData: ImportFromLocalFileData = {
                    baseURI: this.baseURICheck ? this.baseURI : null,
                    localFile: this.localFile,
                    mirrorFile: this.mirrorFileCheck ? this.mirrorFile : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            } else { //repair
                let returnData: RepairFromLocalFileData = {
                    baseURI: this.baseURI,
                    localFile: this.localFile,
                    mirrorFile: this.mirrorFileCheck ? this.mirrorFile : null,
                    transitiveImportAllowance: this.selectedImportAllowance
                };
                this.activeModal.close(returnData);
            }
        } else if (this.importType == ImportType.fromOntologyMirror) {
            //from mirror only import is available (no repair)
            let returnData: ImportFromMirrorData = {
                mirror: this.selectedMirror,
                transitiveImportAllowance: this.selectedImportAllowance
            };
            this.activeModal.close(returnData);
        }
    }

    cancel() {
        this.activeModal.dismiss();
    }

}

enum EditorMode {
    import = "import",
    repair = "repair"
}

/** data when importig ontology */

export interface ImportOntologyReturnData {
    transitiveImportAllowance: TransitiveImportMethodAllowance;
}

export interface ImportFromLocalFileData extends ImportOntologyReturnData {
    baseURI?: string;
    localFile: File;
    mirrorFile?: string;
}

export interface ImportFromMirrorData extends ImportOntologyReturnData {
    mirror: OntologyMirror; //contains both file and baseUri
}

export interface ImportFromWebData extends ImportOntologyReturnData {
    baseURI: string;
    altURL?: string;
    rdfFormat?: RDFFormat;
}

export interface ImportFromWebToMirrorData extends ImportOntologyReturnData {
    baseURI: string;
    altURL?: string;
    mirrorFile: string;
    rdfFormat?: RDFFormat;
}

/** data when repairing import */

export interface RepairImportReturnData {
    baseURI: string;
    transitiveImportAllowance: TransitiveImportMethodAllowance;
}

export interface RepairFromWebData extends RepairImportReturnData {
    altURL?: string;
    rdfFormat?: RDFFormat;
}

export interface RepairFromWebToMirrorData extends RepairImportReturnData {
    altURL?: string;
    mirrorFile: string;
    rdfFormat?: RDFFormat;
}

export interface RepairFromLocalFileData extends RepairImportReturnData {
    localFile: File;
    mirrorFile?: string;
}
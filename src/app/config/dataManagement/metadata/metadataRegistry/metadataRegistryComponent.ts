import { Component } from "@angular/core";
import { OverlayConfig } from 'ngx-modialog';
import { BSModalContextBuilder, Modal } from 'ngx-modialog/plugins/bootstrap';
import { ARTURIResource, ResourceUtils } from "../../../../models/ARTResources";
import { CatalogRecord, DatasetMetadata, LexicalizationSetMetadata } from "../../../../models/Metadata";
import { MetadataRegistryServices } from "../../../../services/metadataRegistryServices";
import { AuthorizationEvaluator } from "../../../../utils/AuthorizationEvaluator";
import { BasicModalServices } from "../../../../widget/modal/basicModal/basicModalServices";
import { NewCatalogRecordModal } from "./newCatalogRecordModal";
import { NewDatasetVersionModal, NewDatasetVersionModalData } from "./newDatasetVersionModal";
import { NewEmbeddedLexicalizationModalData, NewEmbeddedLexicalizationModal } from "./newEmbeddedLexicalizationModal";

@Component({
    selector: "metadata-registry-component",
    templateUrl: "./metadataRegistryComponent.html",
    host: { class: "pageComponent" },
    styles: [`.activePanel { border: 2px solid #cde8ff; border-radius: 6px; }`]
})
export class MetadataRegistryComponent {

    private catalogs: CatalogRecord[];
    private selectedCatalog: CatalogRecord;
    private selectedVersion: DatasetMetadata;

    private lexicalizationSets: LexicalizationSetMetadata[] = [];
    private selectedLexicalizationSet: LexicalizationSetMetadata;
    
    constructor(private metadataRegistryService: MetadataRegistryServices, private basicModals: BasicModalServices, private modal: Modal) { }

    ngOnInit() {
        this.initCatalogRecords();
    }

    /**
     * Catalog records
     */

    private initCatalogRecords(catalogToSelect?: string) {
        this.metadataRegistryService.getCatalogRecords().subscribe(
            catalogs => {
                this.catalogs = catalogs;
                this.selectedCatalog = null;
                this.selectedVersion = null;
                //if catalogToSelect has been provided, select it
                if (catalogToSelect != null) {
                    this.catalogs.forEach(c => {
                        if (c.identity == catalogToSelect) {
                            this.selectCatalog(c);
                            return;
                        }
                    })
                }
            }
        );
    }

    private selectCatalog(catalog: CatalogRecord) {
        if (this.selectedCatalog != catalog) {
            this.selectedCatalog = catalog;
            this.selectedVersion = null;
            this.lexicalizationSets = [];
            this.initEmbeddedLexicalizationSets();
        }
    }

    private discoverDataset() {
        this.basicModals.prompt("Discover Dataset", "Dataset IRI").then(
            iri => {
                if (ResourceUtils.testIRI(iri)) {
                    this.metadataRegistryService.discoverDataset(new ARTURIResource(iri)).subscribe(
                        stResp => {
                            this.initCatalogRecords();        
                        }
                    );
                } else {
                    this.basicModals.alert("Invalid IRI", "'" + iri + "' is not a valid IRI");
                }
            }
        )   
    }

    private addCatalogRecord() {
        const builder = new BSModalContextBuilder<any>();
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        this.modal.open(NewCatalogRecordModal, overlayConfig).result.then(
            ok => {
                this.initCatalogRecords();
            },
            () => {}
        );
    }

    private deletCatalogRecord() {
        this.metadataRegistryService.deleteCatalogRecord(new ARTURIResource(this.selectedCatalog.identity)).subscribe(
            stResp => {
                this.initCatalogRecords();
            }
        );
    }

    /**
     * Dataset version
     */

    private addDatasetVersion() {
        var modalData = new NewDatasetVersionModalData(this.selectedCatalog.identity);
        const builder = new BSModalContextBuilder<NewDatasetVersionModalData>(
            modalData, undefined, NewDatasetVersionModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewDatasetVersionModal, overlayConfig).result.then(
            ok => {
                this.initCatalogRecords(this.selectedCatalog.identity);
            },
            () => {}
        );
    }

    private deleteDatasetVersion() {
        this.metadataRegistryService.deleteDatasetVersions(new ARTURIResource(this.selectedVersion.identity)).subscribe(
            stResp => {
                this.initCatalogRecords();
            }
        );
    }

    /**
     * Lexicalization sets
     */

    private initEmbeddedLexicalizationSets() {
        this.metadataRegistryService.getEmbeddedLexicalizationSets(new ARTURIResource(this.selectedCatalog.abstractDataset.identity)).subscribe(
            sets => {
                this.lexicalizationSets = sets;
                this.selectedLexicalizationSet = null;
            }
        );
    }

    private assessLexicalizationModel() {
        this.metadataRegistryService.assessLexicalizationModel(new ARTURIResource(this.selectedCatalog.abstractDataset.identity)).subscribe(
            stResp => {
                this.initEmbeddedLexicalizationSets();
            }
        )
    }

    private addEmbeddedLexicalizationSet() {
        var modalData = new NewEmbeddedLexicalizationModalData(this.selectedCatalog.abstractDataset.identity);
        const builder = new BSModalContextBuilder<NewEmbeddedLexicalizationModalData>(
            modalData, undefined, NewEmbeddedLexicalizationModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(null).toJSON() };
        return this.modal.open(NewEmbeddedLexicalizationModal, overlayConfig).result.then(
            ok => {
                this.initEmbeddedLexicalizationSets();
            },
            () => {}
        );
    }

    private deleteEmbeddedLexicalizationSet() {
        this.metadataRegistryService.deleteEmbeddedLexicalizationSet(new ARTURIResource(this.selectedLexicalizationSet.identity)).subscribe(
            stResp => {
                this.initEmbeddedLexicalizationSets();
            }
        )
    }


    //Authorizations

    private isAddDatasetAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REGISTRY_CREATE);
    }
    private isRemoveDatasetAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REGISTRY_DELETE);
    }
    private isEditDatasetAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REGISTRY_UPDATE);
    }

    private isAddEmbeddedLexicalizationSetAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REGISTRY_CREATE);
    }
    private isRemoveEmbeddedLexicalizationSetAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.METADATA_REGISTRY_DELETE);
    }
    

}
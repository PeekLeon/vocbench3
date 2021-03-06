import { Component, Input } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import * as FileSaver from 'file-saver';
import { ConfigurableExtensionFactory, ExtensionPointID, Settings, TransformationStep } from "../models/Plugins";
import { RDFFormat } from "../models/RDFFormat";
import { ExportServices } from "../services/exportServices";
import { ExtensionsServices } from "../services/extensionsServices";
import { SparqlServices } from "../services/sparqlServices";
import { UIUtils } from "../utils/UIUtils";
import { BasicModalServices } from "../widget/modal/basicModal/basicModalServices";
import { ModalType } from '../widget/modal/Modals';
import { SharedModalServices } from "../widget/modal/sharedModal/sharedModalServices";

@Component({
    selector: "export-as-rdf-modal",
    templateUrl: "./exportResultAsRdfModal.html",
})
export class ExportResultAsRdfModal {
    @Input() query: string;
    @Input() inferred: boolean;

    exportFormats: RDFFormat[];
    selectedExportFormat: RDFFormat;

    applyFilter: boolean = false;

    //export filter management
    private filters: ConfigurableExtensionFactory[];
    private filtersChain: FilterChainElement[] = [];
    private selectedFilterChainElement: FilterChainElement;

    constructor(public activeModal: NgbActiveModal,
        private exportService: ExportServices, private extensionServices: ExtensionsServices, private sparqlService: SparqlServices,
        private basicModals: BasicModalServices, private sharedModals: SharedModalServices) {
    }

    ngOnInit() {
        this.exportService.getOutputFormats().subscribe(
            formats => {
                this.exportFormats = formats;
                //select RDF/XML as default
                for (let i = 0; i < this.exportFormats.length; i++) {
                    if (this.exportFormats[i].name == "RDF/XML") {
                        this.selectedExportFormat = this.exportFormats[i];
                        return;
                    }
                }
            }
        );

        this.extensionServices.getExtensions(ExtensionPointID.RDF_TRANSFORMERS_ID).subscribe(
            extensions => {
                this.filters = <ConfigurableExtensionFactory[]>extensions;
            }
        );
    }

    ok() {
        let filteringPipelineParam: string;
        if (this.applyFilter) {
            //check if every filter has been configured
            for (let i = 0; i < this.filtersChain.length; i++) {
                if (this.requireConfiguration(this.filtersChain[i])) {
                    this.basicModals.alert({ key: "STATUS.WARNING" }, { key: "MESSAGES.EXPORT_FILTER_NOT_CONFIGURED", params: { filterName: this.filtersChain[i].selectedFactory.id } },
                        ModalType.warning);
                    return;
                }
            }
            let filteringPipeline: any[] = [];
            for (let i = 0; i < this.filtersChain.length; i++) {
                filteringPipeline.push(this.filtersChain[i].convertToFilteringPipelineStep());
            }
            filteringPipelineParam = JSON.stringify(filteringPipeline);
        }
        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        this.sparqlService.exportGraphQueryResultAsRdf(this.query, this.selectedExportFormat, this.inferred, filteringPipelineParam).subscribe(
            blob => {
                UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                FileSaver.saveAs(blob, "sparql_export." + this.selectedExportFormat.defaultFileExtension);
            }
        );

        this.activeModal.close();
    }

    cancel() {
        this.activeModal.dismiss();
    }


    /** =====================================
     * =========== FILTER CHAIN =============
     * =====================================*/
    private selectFilterChainElement(filterChainEl: FilterChainElement) {
        if (this.selectedFilterChainElement == filterChainEl) {
            this.selectedFilterChainElement = null;
        } else {
            this.selectedFilterChainElement = filterChainEl;
        }
    }
    private isSelectedFilterFirst(): boolean {
        return (this.selectedFilterChainElement == this.filtersChain[0]);
    }
    private isSelectedFilterLast(): boolean {
        return (this.selectedFilterChainElement == this.filtersChain[this.filtersChain.length - 1]);
    }

    private appendFilter() {
        this.filtersChain.push(new FilterChainElement(this.filters));
    }
    private removeFilter() {
        this.filtersChain.splice(this.filtersChain.indexOf(this.selectedFilterChainElement), 1);
        this.selectedFilterChainElement = null;
    }
    private moveFilterDown() {
        let prevIndex = this.filtersChain.indexOf(this.selectedFilterChainElement);
        this.filtersChain.splice(prevIndex, 1); //remove from current position
        this.filtersChain.splice(prevIndex + 1, 0, this.selectedFilterChainElement);
    }
    private moveFilterUp() {
        let prevIndex = this.filtersChain.indexOf(this.selectedFilterChainElement);
        this.filtersChain.splice(prevIndex, 1); //remove from current position
        this.filtersChain.splice(prevIndex - 1, 0, this.selectedFilterChainElement);
    }

    private onExtensionUpdated(filterChainEl: FilterChainElement, ext: ConfigurableExtensionFactory) {
        filterChainEl.selectedFactory = ext;
    }
    private onConfigurationUpdated(filterChainEl: FilterChainElement, config: Settings) {
        filterChainEl.selectedConfiguration = config;
    }

    private configureFilter(filterChainEl: FilterChainElement) {
        let selectedConfiguration: Settings = filterChainEl.selectedConfiguration;
        this.sharedModals.configurePlugin(selectedConfiguration).then(
            (filterCfg: any) => {
                //update the selected configuration...
                filterChainEl.selectedConfiguration = filterCfg;
                //...and the configuration among the availables
                let configs: Settings[] = filterChainEl.selectedFactory.configurations;
                for (let i = 0; i < configs.length; i++) {
                    if (configs[i].shortName == filterChainEl.selectedConfiguration.shortName) {
                        configs[i] = filterChainEl.selectedConfiguration;
                    }
                }
            },
            () => { }
        );
    }

    /**
     * Returns true if a plugin of the filter chain require edit of the configuration and it is not configured
     */
    private requireConfiguration(filterChainEl: FilterChainElement): boolean {
        let conf: Settings = filterChainEl.selectedConfiguration;
        if (conf != null && conf.requireConfiguration()) { //!= null required because selectedConfiguration could be not yet initialized
            return true;
        }
        return false;
    }

}


//Utility model classes

class FilterChainElement {
    public availableFactories: ConfigurableExtensionFactory[];
    public selectedFactory: ConfigurableExtensionFactory;
    public selectedConfiguration: Settings;

    constructor(availableFactories: ConfigurableExtensionFactory[]) {
        //clone the available factories, so changing the configuration of one of them, doesn't change the default of the others
        let availableFactClone: ConfigurableExtensionFactory[] = [];
        for (let i = 0; i < availableFactories.length; i++) {
            availableFactClone.push(availableFactories[i].clone());
        }
        this.availableFactories = availableFactClone;
    }

    convertToFilteringPipelineStep(): TransformationStep {
        let filterStep: TransformationStep = { filter: null };
        //filter: factoryId and properties
        let filter: { factoryId: string, configuration: any } = {
            factoryId: this.selectedFactory.id,
            configuration: null
        };
        let selectedConf: Settings = this.selectedConfiguration;

        filter.configuration = selectedConf.getPropertiesAsMap();
        filterStep.filter = filter;
        return filterStep;
    }
}
import { Component, EventEmitter, Output, ViewChild } from "@angular/core";
import { OverlayConfig } from 'ngx-modialog';
import { BSModalContextBuilder, Modal } from 'ngx-modialog/plugins/bootstrap';
import { Observable } from "rxjs/Observable";
import { GraphModalServices } from "../graph/modal/graphModalServices";
import { ARTBNode, ARTResource, ARTURIResource } from "../models/ARTResources";
import { Configuration, ConfigurationProperty } from "../models/Configuration";
import { PrefixMapping } from "../models/Metadata";
import { GraphResultBindings, QueryMode, ResultType } from "../models/Sparql";
import { ConfigurationsServices } from "../services/configurationsServices";
import { ExportServices } from "../services/exportServices";
import { SearchServices } from "../services/searchServices";
import { SparqlServices } from "../services/sparqlServices";
import { AuthorizationEvaluator } from "../utils/AuthorizationEvaluator";
import { UIUtils } from "../utils/UIUtils";
import { VBContext } from "../utils/VBContext";
import { VBProperties } from "../utils/VBProperties";
import { BasicModalServices } from '../widget/modal/basicModal/basicModalServices';
import { SharedModalServices } from '../widget/modal/sharedModal/sharedModalServices';
import { ExportResultAsRdfModal, ExportResultAsRdfModalData } from "./exportResultAsRdfModal";
import { YasguiComponent } from "./yasguiComponent";

@Component({})
export abstract class AbstractSparqlTabComponent {

    @ViewChild(YasguiComponent) viewChildYasgui: YasguiComponent;

    @Output() updateName: EventEmitter<string> = new EventEmitter();
    @Output() savedStatus: EventEmitter<boolean> = new EventEmitter();

    protected query: string;
    protected queryMode: QueryMode = QueryMode.query;
    protected inferred: boolean = false;
    protected storedQueryReference: string;

    private sampleQuery: string = "SELECT * WHERE {\n    ?s ?p ?o .\n} LIMIT 10";
    private queryCache: string; //contains the last query submitted (useful to invoke the export excel)
    private respSparqlJSON: any; //keep the "sparql" JSON object contained in the response
    private resultType: ResultType;
    private headers: string[];
    private queryResult: any;
    private queryInProgress: boolean = false;
    private queryValid: boolean = true;
    private queryTime: string;
    
    private sortOrder: string;
    private asc_Order: string = "_asc";
    private desc_Order: string = "_desc";

    //result paging
    private resultsPage: number = 0;
    private resultsTotPage: number = 0;
    private resultsLimit: number = 100;

    protected sparqlService: SparqlServices;
    protected exportService: ExportServices; 
    protected configurationsService: ConfigurationsServices;
    protected searchService: SearchServices;
    protected basicModals: BasicModalServices;
    protected sharedModals: SharedModalServices;
    protected graphModals: GraphModalServices;
    protected modal: Modal;
    protected vbProp: VBProperties;
    constructor(sparqlService: SparqlServices, exportService: ExportServices, configurationsService: ConfigurationsServices,
        searchService: SearchServices, basicModals: BasicModalServices, sharedModals: SharedModalServices, graphModals: GraphModalServices, modal: Modal, vbProp: VBProperties) {
        this.sparqlService = sparqlService;
        this.exportService = exportService;
        this.configurationsService = configurationsService;
        this.searchService = searchService;
        this.basicModals = basicModals;
        this.sharedModals = sharedModals;
        this.graphModals = graphModals;
        this.modal = modal;
        this.vbProp = vbProp;
    }

    ngOnInit() {
        //collect the prefix namespace mappings
        var mappings: PrefixMapping[] = VBContext.getPrefixMappings();
        var prefixImports: string = "";
        for (var i = 0; i < mappings.length; i++) {
            prefixImports += "PREFIX " + mappings[i].prefix + ": <" + mappings[i].namespace + ">\n";
        }
        //set them as suffix of sampleQuery
        this.sampleQuery = prefixImports + "\n" + this.sampleQuery;

        this.query = this.sampleQuery;
    }

    private doQuery() {
        var initTime = new Date().getTime();
        this.queryResult = null;
        this.resultsPage = 0;
        this.resultsTotPage = 0;
        this.queryCache = this.query; //stored the submitted query

        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        if (this.queryMode == QueryMode.query) {
            if (!AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SPARQL_EVALUATE_QUERY)) {
                this.basicModals.alert("Operation denied", "You are not authorized to perform SPARQL query");
                return;
            }
            this.evaluateQueryImpl().subscribe(
                stResp => {
                    this.sparqlResponseHandler(stResp, initTime);
                }
            );
        } else { //queryMode "update"
            if (!AuthorizationEvaluator.isAuthorized(AuthorizationEvaluator.Actions.SPARQL_EXECUTE_UPDATE)) {
                this.basicModals.alert("Operation denied", "You are not authorized to perform SPARQL update");
                return;
            }
            this.executeUpdateImpl().subscribe(
                stResp => {
                    this.sparqlResponseHandler(stResp, initTime);
                }
            );
        }
    }

    abstract evaluateQueryImpl(): Observable<any>;
    abstract executeUpdateImpl(): Observable<any>;

    private sparqlResponseHandler(stResp: any, initTime: number) {
        this.respSparqlJSON = stResp.sparql;
        //calculates the time spent in query
        var finishTime = new Date().getTime();
        var diffTime = finishTime - initTime;
        this.queryTime = this.getPrettyPrintTime(diffTime);
        //process result
        this.resultType = stResp.resultType;
        if (stResp.resultType == ResultType.tuple || stResp.resultType == ResultType.graph) {
            this.headers = stResp.sparql.head.vars;
            this.queryResult = stResp.sparql.results.bindings;
            //paging handler
            this.resultsTotPage = Math.floor(this.queryResult.length / this.resultsLimit);
            if (this.queryResult.length % this.resultsLimit > 0) {
                this.resultsTotPage++;
            }
        } else if (stResp.resultType == ResultType.boolean) {
            this.headers = ["boolean"];
            this.queryResult = Boolean(stResp.sparql.boolean);
        }
        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
    }

    /**
     * Listener of event querychange, emitted from YasquiComponent.
     * Event is an object {query: string, valid: boolean, mode} where
     * query is the code written in the textarea
     * valid tells wheter the query is syntactically correct
     * mode tells the query mode (query/update) 
     */
    private onQueryChange(event: any) {
        this.query = event.query;
        this.queryValid = event.valid;
        this.queryMode = event.mode;
        this.savedStatus.emit(false);
    }

    private clear() {
        this.respSparqlJSON = null;
        this.headers = null;
        this.queryResult = null;
        this.queryTime = null;
        this.resultsPage = 0;
        this.resultsTotPage = 0;
    }

    private exportAsJSON() {
        this.downloadSavedResult(JSON.stringify(this.respSparqlJSON), "json");
    }

    private exportAsCSV() {
        //https://www.w3.org/TR/sparql11-results-csv-tsv/#csv
        var serialization = "";
        var separator = ",";

        if (this.resultType == ResultType.tuple || this.resultType == ResultType.graph) {
            //headers
            var headers = this.headers;
            for (var i = 0; i < headers.length; i++) {
                serialization += headers[i] + separator;
            }
            serialization = serialization.slice(0, -1); //remove last separator
            serialization += "\n"; //and add new line
            //results
            var res: Array<any> = this.queryResult;
            for (var j = 0; j < res.length; j++) {
                for (var i = 0; i < headers.length; i++) {
                    if (res[j][headers[i]] != undefined) {
                        serialization += this.escapeForCSV(res[j][headers[i]]) + separator;
                    } else {
                        serialization += separator;
                    }
                }
                serialization = serialization.slice(0, -1); //remove last separator
                serialization += "\n"; //and add new line
            }
        } else if (this.resultType == ResultType.boolean) {
            serialization += "result\n" + this.queryResult;
        }

        this.downloadSavedResult(serialization, "csv");
    }

    /**
     * Field is an object {value, type} like the bindings in the sparql response of tuple query
     */
    private escapeForCSV(field: any): string {
        var value: string = field.value;
        /* Fields containing any of 
        " (QUOTATION MARK, code point 34),
        , (COMMA, code point 44),
        LF (code point 10) or CR (code point 13)
        must be quoted using a pair of quotation marks " 
        Blank nodes use the _:label form from Turtle and SPARQL */
        if (field.type == "bnode" && !value.startsWith("_:")) {
            value = "_:" + value;
        } else if (value.includes(String.fromCodePoint(34)) || value.includes(String.fromCodePoint(44)) ||
            value.includes(String.fromCodePoint(10)) || value.includes(String.fromCodePoint(13))) {
            // Within quote strings " is written using a pair of quotation marks "".
            value = value.replace(/"/g, "\"\"");
            value = "\"" + value + "\"";
        }
        return value;
    }

    private exportAsTSV() {
        //https://www.w3.org/TR/sparql11-results-csv-tsv/#csv
        var serialization = "";
        var separator = "\t";

        if (this.resultType == ResultType.tuple || this.resultType == ResultType.graph) {
            //headers
            //Variables are serialized in SPARQL syntax, using question mark ? character followed by the variable name
            var headers = this.headers;
            for (var i = 0; i < headers.length; i++) {
                serialization += headers[i] + separator;
            }
            serialization = serialization.slice(0, -1); //remove last separator
            serialization += "\n"; //and add new line
            //results
            var res: Array<any> = this.queryResult;
            for (var j = 0; j < res.length; j++) {
                for (var i = 0; i < headers.length; i++) {
                    if (res[j][headers[i]] != undefined) {
                        serialization += this.escapeForTSV(res[j][headers[i]]) + separator;
                    } else {
                        serialization += separator;
                    }
                }
                serialization = serialization.slice(0, -1); //remove last separator
                serialization += "\n"; //and add new line
            }
        } else if (this.resultType == ResultType.boolean) {
            serialization += "?result\n" + this.queryResult;
        }

        this.downloadSavedResult(serialization, "tsv");
    }

    /**
     * Field is an object {value, type} like the bindings in the sparql response of tuple query
     * if type is literal, it may contains an attribute "xml:lang" or "datatype"
     */
    private escapeForTSV(field: any): string {
        var value: string = field.value;
        /* IRIs enclosed in <...>,
        literals are enclosed with double quotes "..." or single quotes ' ...' with optional @lang or ^^ for datatype.
        Tab, newline and carriage return characters (codepoints 0x09, 0x0A, 0x0D) are encoded as \t, \n and \r
        Blank nodes use the _:label form from Turtle and SPARQL */
        if (field.type == "uri") {
            value = "<" + value + ">";
        } else if (field.type == "bnode" && !value.startsWith("_:")) {
            value = "_:" + value;
        } else if (field.type == "literal") {
            value = value.replace(/\t/g, "\\t");
            value = value.replace(/\n/g, "\\n");
            value = value.replace(/\r/g, "\\r");
            value = "\"" + value + "\"";
            if (field["xml:lang"] != undefined) {
                value += "@" + field["xml:lang"];
            }
            if (field["datatype"] != undefined) {
                value += "^^" + field["datatype"];
            }
        }
        return value;
    }

    private exportAsSpradsheet(format: "xlsx" | "ods") {
        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        this.sparqlService.exportQueryResultAsSpreadsheet(this.queryCache, format, this.inferred).subscribe(
            blob => {
                UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                var exportLink = window.URL.createObjectURL(blob);
                this.basicModals.downloadLink("Export SPARQL results", null, exportLink, "sparql_export." + format);
            }
        );
    }

    private exportAsRdf() {
        var modalData = new ExportResultAsRdfModalData(this.queryCache, this.inferred);
        const builder = new BSModalContextBuilder<ExportResultAsRdfModalData>(
            modalData, undefined, ExportResultAsRdfModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(27).toJSON() };
        return this.modal.open(ExportResultAsRdfModal, overlayConfig).result;
    }

    /**
     * Prepares a json or text file containing the given content and shows a modal to download it.
     */
    private downloadSavedResult(fileContent: string, type: "csv" | "tsv" | "json") {
        var data = new Blob([fileContent], { type: 'text/plain' });
        var textFile = window.URL.createObjectURL(data);
        var fileName = "result." + type;
        this.basicModals.downloadLink("Export SPARQL results", null, textFile, fileName).then(
            done => { window.URL.revokeObjectURL(textFile); },
            () => { }
        );
    }

    private getPrettyPrintTime(time: number) {
        if (time < 1000) {
            return time + " millisec";
        } else {
            var sec = Math.floor(time / 1000);
            var millisec: any = time % 1000;
            if (millisec < 10) {
                millisec = "00" + millisec;
            } else if (millisec < 100) {
                millisec = "0" + millisec;
            }
            return sec + "," + millisec + " sec";
        }
    }

    private getBindingShow(binding: any) {
        if (binding.type == "uri") {
            return "<" + binding.value + ">";
        } else if (binding.type == "bnode") {
            return "_:" + binding.value;
        } else if (binding.type == "literal") {
            var show = "\"" + binding.value + "\"";
            if (binding['xml:lang']) {
                show += "@" + binding['xml:lang'];
            }
            if (binding.datatype) {
                show += "^^<" + binding.datatype + ">";
            }
            return show;
        }
    }

    private sortResult(header: string) {
        if (this.sortOrder == header + this.asc_Order) { //from ascending to descending (alphabetical) order
            this.queryResult.sort((binding1: any, binding2: any) => {
                return -binding1[header].value.localeCompare(binding2[header].value);
            });
            this.sortOrder = header + this.desc_Order;
        } else {
            this.queryResult.sort((binding1: any, binding2: any) => { //from descending to ascending (alphabetical) order
                return binding1[header].value.localeCompare(binding2[header].value);
            });
            this.sortOrder = header + this.asc_Order;
        }
    }

    private isOpenGraphEnabled() {
        return this.resultType == 'graph' && this.queryResult.length > 0 && this.vbProp.getExperimentalFeaturesEnabled();
    }

    private openGraph() {
        this.graphModals.openGraphQuertyResult(<GraphResultBindings[]>this.queryResult);
    }

    //LOAD/SAVE/PARAMETERIZE QUERY

    /**
     * Loads a configuration (stored query or parameterized query)
     */
    abstract loadConfiguration(): void;
    /**
     * Stores a configuration (stored query or parameterized query)
     */
    abstract saveConfiguration(): void;

    /**
     * Set the query after the load of a stored query
     * @param conf 
     */
    setLoadedQueryConf(conf: Configuration) {
        let query: string;
        let includeInferred: boolean = false;
        let confProps: ConfigurationProperty[] = conf.properties;
        for (var i = 0; i < confProps.length; i++) {
            if (confProps[i].name == "sparql") {
                query = confProps[i].value;
            } else if (confProps[i].name == "includeInferred") {
                includeInferred = confProps[i].value;
            }
        }
        this.query = query;
        this.inferred = includeInferred;
        setTimeout(() => {
            //in order to detect the change of @Input query in the child YasguiComponent
            this.viewChildYasgui.forceContentUpdate();
            this.savedStatus.emit(true);
        });
    }

    private onBindingClick(binding: any) {
        if (this.isBindingResource(binding)) {
            let res: ARTResource;
            if (binding.type == "uri") {
                res = new ARTURIResource(binding.value);
            } else {
                res = new ARTBNode("_:" + binding.value);
            }
            this.sharedModals.openResourceView(res, false);
        }
    }

    private isBindingResource(binding: any): boolean {
        return (binding.type == "uri" || binding.type == "bnode");
    }

}
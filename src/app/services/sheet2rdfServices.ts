import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ARTURIResource, RDFTypesEnum } from "../models/ARTResources";
import { RDFCapabilityType, XRole } from "../models/Coda";
import { RDFFormat } from "../models/RDFFormat";
import { SimpleHeader, TableRow, TriplePreview, GraphApplication, NodeConversion, SubjectHeader, Sheet2RdfDeserializer } from "../models/Sheet2RDF";
import { Deserializer } from "../utils/Deserializer";
import { HttpManager, HttpServiceContext } from "../utils/HttpManager";

@Injectable()
export class Sheet2RDFServices {

    private serviceName = "Sheet2RDF";

    constructor(private httpMgr: HttpManager) { }

    /**
     * Uploads a spreadheet
     * @param file 
     */
    uploadSpreadsheet(file: File) {
        var data: any = {
            file: file
        };
        return this.httpMgr.uploadFile(this.serviceName, "uploadSpreadsheet", data);
    }

    /**
     * Returns the header structures of the uploaded spreadsheet
     */
    getHeaders(): Observable<{subject: SubjectHeader, headers: SimpleHeader[]}> {
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getHeaders", params).map(
            stResp => {
                let subject: SubjectHeader = Sheet2RdfDeserializer.parseSubjectHeader(stResp.subject);

                let headers: SimpleHeader[] = [];
                let headersJson = stResp.headers;
                for (var i = 0; i < headersJson.length; i++) {
                    headers.push(Sheet2RdfDeserializer.parseSimpleHeader(headersJson[i]));
                }

                return { subject: subject, headers: headers };
            }
        );
    }

    getHeaderFromId(headerId: string): Observable<SimpleHeader> {
        var params: any = {
            headerId: headerId
        };
        return this.httpMgr.doGet(this.serviceName, "getHeaderFromId", params).map(
            stResp => {
                return Sheet2RdfDeserializer.parseSimpleHeader(stResp);
            }
        );
    }

    addGraphApplicationToHeader(headerId: string, property: ARTURIResource, nodeId: string, type?: ARTURIResource) {
        let params: any = {
            headerId: headerId,
            property: property,
            nodeId: nodeId,
            type: type
        };
        return this.httpMgr.doPost(this.serviceName, "addGraphApplicationToHeader", params);
    }

    updateGraphApplication(headerId: string, graphId: string, property: ARTURIResource, nodeId: string, type?: ARTURIResource) {
        let params: any = {
            headerId: headerId,
            graphId: graphId,
            property: property,
            nodeId: nodeId,
            type: type
        };
        return this.httpMgr.doPost(this.serviceName, "updateGraphApplication", params);
    }

    removeGraphApplicationFromHeader(headerId: string, graphId: string) {
        let params: any = {
            headerId: headerId,
            graphId: graphId
        };
        return this.httpMgr.doPost(this.serviceName, "removeGraphApplicationFromHeader", params);
    }

    isNodeIdAlreadyUsed(nodeId: string): Observable<boolean> {
        let params: any = {
            nodeId: nodeId
        };
        return this.httpMgr.doGet(this.serviceName, "isNodeIdAlreadyUsed", params);
    }

    addNodeToHeader(headerId: string, nodeId: string, converterCapability: RDFCapabilityType, 
        converterContract: string, converterDatatype?: ARTURIResource, converterLanguage?: string, 
        converterParams?: {[key: string]: string}, converterXRole?: XRole, memoize?: boolean) {
        let params: any = {
            headerId: headerId,
            nodeId: nodeId,
            converterCapability: converterCapability,
            converterContract: converterContract,
            converterDatatype: converterDatatype,
            converterLanguage: converterLanguage,
            converterParams: (converterParams != null) ? JSON.stringify(converterParams) : null,
            converterXRole: converterXRole,
            memoize: memoize
        };
        return this.httpMgr.doPost(this.serviceName, "addNodeToHeader", params);
    }

    removeNodeFromHeader(headerId: string, nodeId: string) {
        let params: any = {
            headerId: headerId,
            nodeId: nodeId
        };
        return this.httpMgr.doPost(this.serviceName, "removeNodeFromHeader", params);
    }

    updateSubjectHeader(headerId: string, converterContract: string, converterParams?: {[key: string]: string}, converterXRole?: XRole, 
        type?: ARTURIResource, memoize?: boolean) {
        let params: any = {
            headerId: headerId,
            converterContract: converterContract,
            converterParams: (converterParams != null) ? JSON.stringify(converterParams) : null,
            converterXRole: converterXRole,
            type: type,
            memoize
        };
        return this.httpMgr.doPost(this.serviceName, "updateSubjectHeader", params);
    }

    /**
     * Returns a preview (first maxRows rows) of the spreadsheet uploaded
     * @param maxRows 
     */
    getTablePreview(maxRows: number): Observable<{returned: number, total: number, rows: TableRow[]}> {
        var params: any = {
            maxRows: maxRows,
        };
        return this.httpMgr.doGet(this.serviceName, "getTablePreview", params).map(
            stResp => {
                return stResp;
            }
        );
    }

    /**
     * Lets sheet2rdf generate the pearl and returns it
     * @param skosSchema 
     */
    getPearl(skosSchema?: ARTURIResource): Observable<string> {
        var params: any = {};
        if (skosSchema != null) {
            params.skosSchema = skosSchema;
        }
        return this.httpMgr.doGet(this.serviceName, "getPearl", params).map(
            stResp => {
                return stResp;
            }
        );
    }

    /**
     * Saves the pearl code
     * @param pearlCode 
     */
    savePearl(pearlCode: string) {
        var data: any = {
            pearlCode: pearlCode
        };
        return this.httpMgr.doPost(this.serviceName, "savePearl", data);
    }

    validatePearl(pearlCode: string): Observable<{valid: boolean, details: string}> {
        var params: any = {
            pearlCode: pearlCode
        };
        return this.httpMgr.doPost(this.serviceName, "validatePearl", params);
    }

    /**
     * Uploads a file containing a pearl code to use.
     * Returns the pearl code.
     * @param file 
     */
    uploadPearl(file: File): Observable<string> {
        var data: any = {
            file: file
        };
        return this.httpMgr.uploadFile(this.serviceName, "uploadPearl", data).map(
            stResp => {
                return stResp;
            }
        );
    }

    /**
     * Returns a preview of the triples generated. The preview contains just the triples generated considering the first
     * 'maxTableRows' of the datasheet
     * @param maxTableRows 
     */
    getTriplesPreview(maxTableRows: number): Observable<{returned: number, total: number, triples: TriplePreview[]}> {
        var params: any = {
            maxTableRows: maxTableRows
        };
        return this.httpMgr.doGet(this.serviceName, "getTriplesPreview", params).map(
            stResp => {
                stResp.returned;
                return stResp;
            }
        );
    }

    addTriples() {
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "addTriples", params);
    }

    exportTriples(outputFormat: RDFFormat) {
        var params: any = {
            outputFormat: outputFormat.name
        };
        return this.httpMgr.downloadFile(this.serviceName, "exportTriples", params);
    }

    closeSession() {
        var params = {};
        return this.httpMgr.doGet(this.serviceName, "closeSession", params).map(
            stResp => {
                HttpServiceContext.removeSessionToken();
                return stResp;
            }
        );
    }

}
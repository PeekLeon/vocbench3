import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core";
import { ARTLiteral, ARTURIResource } from "src/app/models/ARTResources";
import { ConverterContractDescription, RDFCapabilityType, SignatureDescription, XRole } from "src/app/models/Coda";
import { CODAConverter } from "src/app/models/Sheet2RDF";
import { RDF } from "src/app/models/Vocabulary";
import { CODAServices } from "src/app/services/codaServices";
import { RangeType } from "src/app/services/propertyServices";


@Component({
    selector: "converter-config",
    templateUrl: "./converterConfiguratorComponent.html",
    host: { class: "vbox" }
})
export class ConverterConfiguratorComponent {

    @Input() converter: CODAConverter; //converter to restore, with params, language, datatype...
    @Input() rangeType: RangeType; //restrict the converters to those which capability is compliant (if not provided, all converter are listed)
    @Input() language: string; //restrict/force the selection of language for literal converters
    @Input() datatype: ARTURIResource; //restrict/force the selection of datatype for literal converters
    @Output() update: EventEmitter<ConverterConfigStatus> = new EventEmitter();

    converters: ConverterContractDescription[] = []; //all converters
    availableConverters: ConverterContractDescription[] = []; //only selectable converters (restricted according rangeType)
    selectedConverter: ConverterContractDescription;

    availableSignatures: SignatureDescription[];
    selectedSignature: SignatureDescription;
    private signatureParams: SignatureParam[];

    private readonly languageLiteralAspect: string = "language";
    private readonly datatypeLiteralAspect: string = "datatype";
    private literalAspectOpts: string[] = ["---", this.languageLiteralAspect, this.datatypeLiteralAspect];
    private selectedLiteralAspect: string = this.literalAspectOpts[0];
    literalAspectChangeable: boolean = true;

    xRoles: string[] = [XRole.concept, XRole.conceptScheme, XRole.skosCollection, XRole.xLabel, XRole.xNote];
    XROLE_SEL_ATTR: string = 'xRoleSelection';
    xRoleOther: string = "other";
    
    constructor(private codaService: CODAServices) {}

    ngOnInit() {
        if (this.language == null && this.converter != null) { //language not provided as input => get the language of the input converter
            this.language = this.converter.language;
        }
        if (this.language != null) {
            this.selectedLiteralAspect = this.languageLiteralAspect;
            this.literalAspectChangeable = false;
        } else if (this.datatype != null) {
            if (this.datatype.equals(RDF.langString)) {
                this.selectedLiteralAspect = this.languageLiteralAspect;
            } else {
                this.selectedLiteralAspect = this.datatypeLiteralAspect;
            }
            this.literalAspectChangeable = false;
        }

        this.codaService.listConverterContracts().subscribe(
            converters => {
                this.converters = converters;
                this.initAvailableConverters();
                if (this.converter != null) {
                    this.restoreConverterSelection();
                }
            }
        );
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['converter'] && !changes['converter'].isFirstChange()) {
            //NOT isFirstChange required since for the first initialization it needs to wait for availableConverters list initialization
            //in fact restoreConverterSelection is invoked in ngOnInit also after listConverterContracts invocation
            if (this.converter != null) {
                this.restoreConverterSelection();
            } else { //converter set to null => reset all
                this.selectedConverter = null;
                this.availableSignatures = [];
                this.selectedSignature = null;
                let status: ConverterConfigStatus = {
                    converter: this.converter,
                    converterDesc: this.selectedConverter,
                    signatureDesc: this.selectedSignature
                };
                this.update.emit(status);
            }
        }
        if (changes['rangeType'] && !changes['rangeType'].isFirstChange()) {
            //not the first change, otherwise all variables will be reset also when the input converter needs to be restored
            this.initAvailableConverters();
            //reset all and emit changes
            this.converter = null;
            this.selectedConverter = null;
            this.availableSignatures = [];
            this.selectedSignature = null;
            let status: ConverterConfigStatus = {
                converter: this.converter,
                converterDesc: this.selectedConverter,
                signatureDesc: this.selectedSignature
            };
            this.update.emit(status);
        }
    }

    private initAvailableConverters() {
        this.availableConverters = [];
        this.converters.forEach(c => {
            // check converter capability compatibility
            let capability: RDFCapabilityType = c.getRDFCapability();
            if (this.rangeType == null) {
                this.availableConverters.push(c);

            } else if (this.rangeType == RangeType.resource) {
                if (capability == RDFCapabilityType.node || capability == RDFCapabilityType.uri) {
                    this.availableConverters.push(c);
                }
            } else if (this.rangeType == RangeType.literal) {
                if (capability == RDFCapabilityType.node || capability == RDFCapabilityType.literal) {
                    let datatypes = c.getDatatypes();
                    if (this.datatype != null && datatypes.length > 0) {
                        if (datatypes.indexOf(this.datatype.getURI()) != -1) { //datatype in the datatypes of the converter => the converter can produce the required dt
                            this.availableConverters.push(c);        
                        }
                    } else {
                        this.availableConverters.push(c);
                    }
                }
            }
        });
    }

    /**
     * Restore the selection of the Input converter
     */
    private restoreConverterSelection() {
        //restore the selected converter
        this.availableConverters.forEach(c => {
            if (c.getURI() == this.converter.contractUri) {
                this.selectConverter(c, false);
            }
        });
        //restore the selected signature and the parameters
        let signatureToRestore: SignatureDescription;
        signLoop: for (let s of this.selectedConverter.getSignatures()) {
            if (!this.isSignatureReturnTypeCompliant(this.converter.type, s.getReturnType())) {
                continue; //skip this signature
            }
            //compare the names of the params
            let signatureParams: string[] = s.getParameters().map(p => p.getName());
            let converterParams: string[] = Object.keys(this.converter.params);
            signatureParams.sort();
            converterParams.sort();
            if (signatureParams.length == converterParams.length) {
                for (let i = 0; i < signatureParams.length; i++) {
                    if (signatureParams[i] != converterParams[i]) {
                        continue signLoop; //found a different parameter => this is not the used signature
                    }
                }
                //if this code is reached, every parameter of the signature was found in the converter => select the signature
                signatureToRestore = s;
                break;
            }
        }
        if (signatureToRestore != null) {
            this.selectSignature(signatureToRestore, false);
            //now restore the values
            for (let paramName in this.converter.params) {
                let paramValue = this.converter.params[paramName];
                if (paramValue == null) return;

                let paramInSignature = this.signatureParams.find(p => p.name == paramName);
                paramInSignature.value = paramValue;

                // this.signatureParams.find(p => p.name == paramName).value = this.converter.params[paramName];    
                if (paramName == 'xRole') {
                    if (this.xRoles.includes(paramValue)) { //well-known xRole => assign to xRoleSelection the value
                        paramInSignature[this.XROLE_SEL_ATTR] = paramValue;
                    } else { //other value => assign to xRoleSelection the "other" option
                        paramInSignature[this.XROLE_SEL_ATTR] = this.xRoleOther;
                    }
                }
            }
        }
    }

    /**
     * When restoring a previously selected converter (among those available), it may happen that, for the default one, it is restored
     * the wrong one, e.g. default uri was selected, the default literal is restored. This happens because
     * the converter to restore and the availables has the same uri and the same signature params, there is no check on the return type
     */
    private isSignatureReturnTypeCompliant(converterType: RDFCapabilityType, signatureReturnType: string): boolean {
        if (signatureReturnType == "org.eclipse.rdf4j.model.Literal") {
            return converterType == RDFCapabilityType.literal;
        } else if (signatureReturnType == "org.eclipse.rdf4j.model.IRI") {
            return converterType == RDFCapabilityType.uri;
        } else if (signatureReturnType == "org.eclipse.rdf4j.model.Value") {
            return true;
        } else {
            return false;
        }
    }

    /**
     * 
     * @param converter 
     * @param emitUpdate useful to prevent to emit update during the converter selection restoring that might influence
     */
    selectConverter(converter: ConverterContractDescription, emitUpdate: boolean = true) {
        if (this.selectedConverter != converter) {
            this.selectedConverter = converter;
            /**
             * Consider as available signatures, only those which the return type is compliant with the range type required:
             * - if range type is resource, accepted return types are IRI and value
             * - if range type is literal (plain or typed), accepted return type ir Literal
             */
            this.availableSignatures = [];
            this.selectedConverter.getSignatures().forEach(s => {
                let returnType: string = s.getReturnType();
                if (this.rangeType == null) {
                    this.availableSignatures.push(s);
                } else if (this.rangeType == RangeType.resource && (returnType.endsWith(".IRI") || returnType.endsWith(".Value"))) {
                    this.availableSignatures.push(s);
                } else if ((this.rangeType == RangeType.literal) && returnType.endsWith(".Literal")) {
                    this.availableSignatures.push(s);
                }
            });
            this.selectSignature(this.availableSignatures[0], false);
        }
        if (emitUpdate) {
            this.emitStatusUpdate();
        }
    }

    /**
     * ========== Signature customization ==========
     */

    /**
     * check if the selected converter is the default one and if the selected signature is the literal one
     */
    showDefaultLiteralConverterOpt(): boolean {
        return this.selectedConverter != null && this.selectedConverter.getURI() == ConverterContractDescription.NAMESPACE + "default" &&
            this.selectedSignature != null && this.selectedSignature.getReturnType().endsWith(".Literal");
    }

    getSignatureShow(signature: SignatureDescription): string {
        return this.selectedConverter.getSerialization(signature);
    }

    /**
     * 
     * @param signature 
     * @param emitUpdate useful to prevent to emit update during the converter selection restoring that might influence 
     */
    private selectSignature(signature: SignatureDescription, emitUpdate: boolean = true) {
        this.selectedSignature = signature;
        this.signatureParams = [];
        this.selectedSignature.getParameters().forEach(p => {
            this.signatureParams.push({ name: p.getName(), value: null, type: p.getType() });
        });
        if (emitUpdate) {
            this.emitStatusUpdate();
        }
    }

    getParameterTitle(parameter: SignatureParam): string {
        if (parameter.type == "java.lang.String") {
            return "String parameter";
        } else if (parameter.type == "org.eclipse.rdf4j.model.Value[]") {
            return "List of values. Each value can be the id of a node or an RDF value represented in NT serialization";
        } else if (parameter.type == "java.util.Map<java.lang.String, org.eclipse.rdf4j.model.Value>") {
            return "Key-value Map. Each value can be the id of a node or an RDF value represented in NT serialization";
        }
        return "";
    }

    /**
     * This is an ad-hoc handler for xRole parameter. The idea is to force the selection to one of the predefined options (xLabel, xNote, concept, ...).
     * In addition there's a further option "Other" which allows user to enter a custom value.
     * When the selection (xRoleSelection attr) changes, this handler checks if the selection is one of the well-known roles.
     * In case, it assigns the selection to the param, otherwise, if the selection is "other", it doesn't do nothin since 
     * the param value is bound to the value of the input field added into the view
     *
     * @param parameter 
     */
    onXRoleChange(parameter: SignatureParam) {
        if (this.xRoles.includes(parameter[this.XROLE_SEL_ATTR])) { //in case the selected xRole is one of the predefined
            parameter.value = parameter[this.XROLE_SEL_ATTR];
        }
        this.onSignatureParamChange();
    }

    onMapParamChange(value: {[key: string]:any}, p: SignatureParam) {
        p.value = value;
        this.emitStatusUpdate();
    }

    onListParamChange(value: any[], p: SignatureParam) {
        p.value = value;
        this.emitStatusUpdate();
    }

    onSignatureParamChange() {
        this.emitStatusUpdate();
    }

    /**
     * ========== ========== ========== ==========
     */

    private emitStatusUpdate() {
        let params: { [key: string]: any } = {};
        this.signatureParams.forEach(p => {
            let value: any;
            if (p.type == "java.lang.String") {
                value = p.value;
            } else if (p.type == "org.eclipse.rdf4j.model.Value") {
                if (p.value != null && p.value.trim() != "") {
                    value = new ARTLiteral(p.value);
                }
            } else if (p.type == "java.util.Map<java.lang.String, org.eclipse.rdf4j.model.Value>") {
                value = p.value;
            } else if (p.type == "org.eclipse.rdf4j.model.Value[]") {
                value = p.value;
            }
            params[p.name] = value;
        });
        let capability = this.selectedSignature.getReturnType().endsWith(".Literal") ? RDFCapabilityType.literal : RDFCapabilityType.uri;
        let lang: string;
        let datatypeUri: string;
        if (capability == RDFCapabilityType.literal && this.selectedConverter.getURI().endsWith("/default")) {
            if (this.selectedLiteralAspect == this.languageLiteralAspect) {
                lang = this.language;
            } else if (this.selectedLiteralAspect == this.datatypeLiteralAspect) {
                datatypeUri = this.datatype.getURI();
            }
        }
        //update the converter object
        if (this.converter == null) { //instantiate it if never done (not set as Input and status emitted for the first time)
            this.converter = new CODAConverter(capability, this.selectedConverter.getURI());
        } else {
            this.converter.type = capability;
            this.converter.contractUri = this.selectedConverter.getURI();
        }
        this.converter.language = lang;
        this.converter.datatypeUri = datatypeUri;
        this.converter.datatypeCapability = (this.selectedConverter.getDatatypes().length > 0) ? this.selectedConverter.getDatatypes()[0] : null;
        this.converter.params = params;

        let status: ConverterConfigStatus = {
            converter: this.converter,
            converterDesc: this.selectedConverter,
            signatureDesc: this.selectedSignature
        };
        this.update.emit(status);
    }

}

/**
 * An object containing useful stuff about a converter configuration:
 * - CODAConverter: a simplified representation of the converter, with parameters values, language and datatype (for literal converter)
 * - ConverterContractDescription: DTO returned by ST for a complete representation of the converter
 * - SignatureDescription: DTO returned by ST about the chosen signature of the converter (doesn't contains the values, they're in the CODAConverter)
 */
export interface ConverterConfigStatus {
    converter: CODAConverter;
    converterDesc: ConverterContractDescription;
    signatureDesc: SignatureDescription;
}

class SignatureParam { 
    name: string;
    value: any;
    type: string;
}
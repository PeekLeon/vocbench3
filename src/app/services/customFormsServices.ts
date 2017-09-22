import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpManager, VBRequestOptions } from "../utils/HttpManager";
import { Deserializer } from "../utils/Deserializer";
import { ARTResource, ARTURIResource, ARTNode, ARTPredicateObjects, ResourceUtils, RDFResourceRolesEnum } from "../models/ARTResources";
import { FormCollectionMapping, FormCollection, CustomForm, CustomFormType, FormField, BrokenCFStructure, 
    FormFieldType, CustomFormLevel } from "../models/CustomForms";

@Injectable()
export class CustomFormsServices {

    private serviceName = "CustomForms";

    constructor(private httpMgr: HttpManager) { }

    /**
     * Returns the description of a reified resource, object of a predicate with custom range
     * @param predicate predicate of which the resource represents the object
     * @param resource object of a predicate with a custom range.
     * @return 
     */
    getGraphObjectDescription(predicate: ARTURIResource, resource: ARTNode): Observable<ARTPredicateObjects[]> {
        console.log("[CustomFormsServices] getGraphObjectDescription");
        var params: any = {
            predicate: predicate,
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "getGraphObjectDescription", params, true).map(
            stResp => {
                var predicateObjectList: ARTPredicateObjects[];
                if (stResp.properties != null) { //only if resource has a reified description
                    predicateObjectList = Deserializer.createPredicateObjectsList(stResp.properties);
                }
                return predicateObjectList;
            }
        );
    }

    /**
     * Removes the reified resource generated by means of a custom range
     * @param predicate predicate of wich the resource represents the object
     * @param resource object of a predicate with a custom range
     * @return 
     */
    removeReifiedResource(subject: ARTResource, predicate: ARTURIResource, resource: ARTNode) {
        console.log("[CustomFormsServices] removeReifiedResource");
        var params: any = {
            subject: subject,
            predicate: predicate,
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "removeReifiedResource", params, true);
    }

    /**
     * Returns the form for the given CustomForm
     * @param creId id of a CustomForm
     * @return an array of FormField
     */
    getCustomFormRepresentation(customFormId: string) {
        console.log("[CustomFormsServices] getCustomFormRepresentation");
        var params: any = {
            id: customFormId
        };
        var options: VBRequestOptions = new VBRequestOptions({ errorAlertOpt: { show: false } });
        return this.httpMgr.doGet(this.serviceName, "getCustomFormRepresentation", params, true, options).map(
            stResp => {
                /* this service could throw an error if Pearl is invalid
                (in this case the server throws a PRParserException and it is handled in HttpManager),
                or if the form doesn't contain any formEntry (in this case <form> element doesn't contain
                <formEntry> elements but has an "exception" attribute) */
                var form: Array<FormField> = [];

                var pendingEntryDependencies = <any>[];
                //an array of objects {phIdEntry: string, userPromptArg: string} that collects the userPrompt
                //of the formEntries that are used just as argument/dependency of another formEntry and later
                //will be set as arguments to other formEntries

                for (var i = 0; i < stResp.length; i++) {
                    var placeholderId = stResp[i].placeholderId;
                    var type: FormFieldType = stResp[i].type == "literal" ? "literal" : "uri";
                    var mandatory = stResp[i].mandatory;
                    var userPrompt = stResp[i].userPrompt;
                    var converter = stResp[i].converter.uri;
                    //coda:langString could have an argument to specify the language through another entry 
                    if (converter == "http://art.uniroma2.it/coda/contracts/langString") {
                        var argUserPrompt = stResp[i].converter.arg.userPrompt;
                        pendingEntryDependencies.push({ phIdEntry: placeholderId, userPromptArg: argUserPrompt });
                    }
                    var entry = new FormField(placeholderId, type, mandatory, userPrompt, converter);
                    if (type == "literal") {
                        var datatype = stResp[i].datatype;
                        if (datatype != undefined) {
                            entry.setDatatype(datatype);
                        }
                        var lang = stResp[i].lang;
                        if (lang != undefined) {
                            entry.setLang(lang);
                        }
                    }
                    form.push(entry);
                }

                //iterate over pendingEntryDependencies and set them as argument of other formEntries
                for (var i = 0; i < pendingEntryDependencies.length; i++) {
                    var argEntry: FormField; //entry that is used as argument of another
                    //get the FormField to set as argument
                    for (var j = 0; j < form.length; j++) {
                        if (form[j].getUserPrompt() == pendingEntryDependencies[i].userPromptArg) {
                            argEntry = form[j];
                            argEntry.setDependency(true); //mark the entry as a dependency
                        }
                    }
                    //look for the entry to which inject the argEntry as argument
                    for (var j = 0; j < form.length; j++) {
                        if (pendingEntryDependencies[i].phIdEntry == form[j].getPlaceholderId()) {
                            form[j].setConverterArg(argEntry);
                        }
                    }
                }
                return form;
            }
        );
    }

    /**
     * Makes Coda execute the pearl rule in the given CustomForm and with the value specified in the entryMap.
     * Then "append" the generated triples (representing a reified object) to the subject-predicate pair. 
     * @param subject
     * @param predicate
     * @param customFormId
     * @param entryMap array of object {key: value} where "key" is the feature
     * name in the pearl rule which its "value" is provided by means a custom form
     */
    addValueThroughCustomRange(subject: ARTResource, predicate: ARTURIResource, customFormId: string, entryMap: any) {
        console.log("[CustomFormsServices] addValueThroughCustomRange");
        var params: any = {
            subject: subject,
            predicate: predicate,
            customFormId: customFormId,
            userPromptMap: JSON.stringify(entryMap)
        };
        return this.httpMgr.doPost(this.serviceName, "addValueThroughCustomRange", params, true);
    }

    /**
     * FORM MAPPINGS
     */

    /**
     * Returns the mapping between FormCollection and resources.
     */
    getCustomFormConfigMap(): Observable<FormCollectionMapping[]> {
        console.log("[CustomFormsServices] getCustomFormConfigMap");
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getCustomFormConfigMap", params, true).map(
            stResp => {
                var fcMappings: Array<FormCollectionMapping> = [];
                for (var i = 0; i < stResp.length; i++) {
                    let mappingNode = stResp[i];
                    let resource = new ARTURIResource(mappingNode.resource, mappingNode.resource, RDFResourceRolesEnum.individual);
                    let formCollection: FormCollection = new FormCollection(mappingNode.formCollection.id);
                    formCollection.setLevel(mappingNode.formCollection.level);
                    fcMappings.push(new FormCollectionMapping(formCollection, resource, mappingNode.replace));
                }
                //sort by resource uri
                fcMappings.sort(
                    function (a: FormCollectionMapping, b: FormCollectionMapping) {
                        if (a.getResource().getURI() < b.getResource().getURI()) return -1;
                        if (a.getResource().getURI() > b.getResource().getURI()) return 1;
                        return 0;
                    }
                );
                return fcMappings;
            }
        );
    }

    /**
     * Adds a new FormCollection - resource mapping
     * @param formCollId
     * @param resource
     * @param replace tells if the FormCollection will replace the "classic" ranges in the response of getRange service.
     * Currently if it's true it could cause error since the getRange response handler expects <ranges> element.
     */
    addFormsMapping(formCollId: string, resource: ARTURIResource, replace?: boolean) {
        console.log("[CustomFormsServices] addFormsMapping");
        var params: any = {
            formCollId: formCollId,
            resource: resource
        };
        if (replace != undefined) {
            params.replace = replace;
        }
        return this.httpMgr.doGet(this.serviceName, "addFormsMapping", params, true);
    }

    /**
     * Removes the FormCollection from the given resource
     * @param resource
     */
    removeFormCollectionOfResource(resource: ARTURIResource) {
        console.log("[CustomFormsServices] removeFormCollectionOfResource");
        var params: any = {
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "removeFormCollectionOfResource", params, true);
    }

    /**
	 * Update the replaceRanges attribute of a property-CR mapping for the given property
	 * @param property
	 * @param replaceRanges
     */
    updateReplace(resource: ARTURIResource, replace: boolean) {
        console.log("[CustomFormsServices] updateReplace");
        var params: any = {
            resource: resource,
            replace: replace
        };
        return this.httpMgr.doGet(this.serviceName, "updateReplace", params, true);
    }

    /**
     * FORM COLLECTION
     */

    /**
     * Returns the IDs of FormCollection available
     */
    getAllFormCollections(): Observable<FormCollection[]> {
        console.log("[CustomFormsServices] getAllFormCollections");
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getAllFormCollections", params, true).map(
            stResp => {
                var formCollections: Array<FormCollection> = [];
                for (var i = 0; i < stResp.length; i++) {
                    let fc: FormCollection = new FormCollection(stResp[i].id);
                    fc.setLevel(stResp[i].level);
                    formCollections.push(fc);
                }
                formCollections.sort(
                    function (a: FormCollection, b: FormCollection) {
                        if (a.getId() < b.getId()) return -1;
                        if (a.getId() > b.getId()) return 1;
                        return 0;
                    }
                );
                return formCollections;
            }
        );
    }

    /**
     * Returns the FormCollection with the given id.
     * @param id
     */
    getFormCollection(id: string): Observable<FormCollection> {
        console.log("[CustomFormsServices] getFormCollection");
        var params: any = {
            id: id
        };
        return this.httpMgr.doGet(this.serviceName, "getFormCollection", params, true).map(
            stResp => {
                var formColl: FormCollection;
                var fcId = stResp.id;
                formColl = new FormCollection(fcId);
                var forms: CustomForm[] = [];
                for (var i = 0; i < stResp.forms.length; i++) {
                    let cf: CustomForm = new CustomForm(stResp.forms[i].id);
                    cf.setLevel(stResp.forms[i].level);
                    forms.push(cf);
                }
                forms.sort(
                    function (a: CustomForm, b: CustomForm) {
                        if (a.getId() < b.getId()) return -1;
                        if (a.getId() > b.getId()) return 1;
                        return 0;
                    }
                );
                formColl.setForms(forms);

                var suggestions: ARTURIResource[] = Deserializer.createURIArray(stResp.suggestions);
                ResourceUtils.sortResources(suggestions, "value");
                formColl.setSuggestions(suggestions);
                
                return formColl;
            }
        );
    }

    /**
     * Creates an empty FormCollection with the given id
     * @param id
     */
    createFormCollection(id: string) {
        console.log("[CustomFormsServices] createFormCollection");
        var params: any = {
            id: id
        };
        return this.httpMgr.doGet(this.serviceName, "createFormCollection", params, true);
    }

    /**
     * Deletes the FormCollection with the given ID and consequentially the CR-prop mapping with the same CR
     * @param id the ID of the FormCollection to delete
     */
    deleteFormCollection(id: string) {
        console.log("[CustomFormsServices] deleteFormCollection");
        var params: any = {
            id: id
        };
        return this.httpMgr.doGet(this.serviceName, "deleteFormCollection", params, true);
    }

    /**
     * Creates a new FC cloning an existing FC
     * @param sourceId id of the FC to clone
     * @param targetId id of the FC to create
     */
    cloneFormCollection(sourceId: string, targetId: string) {
        console.log("[CustomFormsServices] cloneFormCollection");
        var params: any = {
            sourceId: sourceId,
            targetId: targetId
        };
        return this.httpMgr.doGet(this.serviceName, "cloneFormCollection", params, true);
    }

    /**
     * Export a FC
     * @param id id of the FC to export
     */
    exportFormCollection(id: string) {
        console.log("[CustomFormsServices] exportFormCollection");
        var params = {
            id: id
        };
        return this.httpMgr.downloadFile(this.serviceName, "exportFormCollection", params);
    }

    /**
     * Imports a FC
     * @param inputFile file of the FC to import 
     * @param newId ID of the new FC (Optional, if not provided it will have the ID of the input FC)
     */
    importFormCollection(inputFile: File, newId?: string) {
        console.log("[CustomFormsServices] importFormCollection");
        var data: any = {
            inputFile: inputFile
        };
        if (newId != null) {
            data.newId = newId;
        }
        return this.httpMgr.uploadFile(this.serviceName, "importFormCollection", data, true);
    }

    /**
     * Updates a FormCollection
     * @param formCollectionId 
     * @param customFormIds 
     * @param suggestions 
     */
    updateFromCollection(formCollectionId: string, customFormIds: string[], suggestions: ARTURIResource[]) {
        console.log("[CustomFormsServices] updateFromCollection");
        var params: any = {
            formCollectionId: formCollectionId,
            customFormIds: customFormIds,
            suggestions: suggestions
        };
        return this.httpMgr.doPost(this.serviceName, "updateFromCollection", params, true);
    }

    /**
     * CUSTOM FORM
     */

    /**
     * Returns the IDs of all the CustomForm available
     */
    getAllCustomForms(): Observable<CustomForm[]> {
        console.log("[CustomFormsServices] getAllCustomForms");
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getAllCustomForms", params, true).map(
            stResp => {
                var customForms: Array<CustomForm> = [];
                for (var i = 0; i < stResp.length; i++) {
                    let cf: CustomForm = new CustomForm(stResp[i].id);
                    cf.setLevel(stResp[i].level);
                    customForms.push(cf);
                }
                //sort
                customForms.sort(
                    function (a: CustomForm, b: CustomForm) {
                        if (a.getId() < b.getId()) return -1;
                        if (a.getId() > b.getId()) return 1;
                        return 0;
                    }
                );
                return customForms;
            }
        );
    }

    /**
     * Returns the FormCollection linked with the given  available CustomForm to use as constructor for the given resource
     */
    getCustomConstructors(resource: ARTURIResource): Observable<CustomForm[]> {
        console.log("[CustomFormsServices] getCustomConstructors");
        var params: any = {
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "getCustomConstructors", params, true).map(
            stResp => {
                var forms: CustomForm[] = [];
                if (stResp.forms) {
                    for (var i = 0; i < stResp.forms.length; i++) {
                        let cf: CustomForm = new CustomForm(stResp.forms[i].id);
                        cf.setName(stResp.forms[i].name);
                        cf.setType(stResp.forms[i].type);
                        cf.setDescription(stResp.forms[i].description);
                        forms.push(cf);
                    }
                    forms.sort(
                        function (a: CustomForm, b: CustomForm) {
                            if (a.getName() < b.getName()) return -1;
                            if (a.getName() > b.getName()) return 1;
                            return 0;
                        }
                    )
                }
                return forms;
            }
        );
    }

    /**
     * Retrieves the CustomForm with the given id
     * @param id
     */
    getCustomForm(id: string) {
        console.log("[CustomFormsServices] getCustomForm");
        var params: any = {
            id: id
        };
        return this.httpMgr.doGet(this.serviceName, "getCustomForm", params, true).map(
            stResp => {
                var id: string = stResp.id;
                var customForm: CustomForm = new CustomForm(id);
                var name: string = stResp.name;
                customForm.setName(name);
                var type: CustomFormType = stResp.type == "graph" ? "graph" : "node";
                customForm.setType(type);
                var description: string = stResp.description;
                customForm.setDescription(description);
                var ref: string = stResp.ref;
                customForm.setRef(ref);
                if (type == "graph") {
                    var showPropChainAttr: string = stResp.showPropertyChain;
                    var propChain: ARTURIResource[] = [];
                    if (showPropChainAttr != null && showPropChainAttr != "") {
                        var splitted = showPropChainAttr.split(",");
                        for (var i = 0; i < splitted.length; i++) {
                            propChain.push(new ARTURIResource(splitted[i], splitted[i], RDFResourceRolesEnum.property));
                        }
                    }
                    customForm.setShowPropertyChain(propChain);
                }
                return customForm;
            }
        );
    }

    /**
     * Creates a CustomForm
     * @param type type of the CF, available values: graph/node
     * @param id id (comprensive of prefix) of the CRE
     * @param name
     * @param description
     * @param ref a pearl rule in case type is "graph", or a converter in case of type is "node"
     * @param showPropChain to provide only if type is "graph", tells the property chain which value should show in place of the
     * generated graph by means of this CRE
     */
    createCustomForm(type: CustomFormType, id: string, name: string, description: string, ref: string, showPropChain?: ARTURIResource[]) {
        console.log("[CustomFormsServices] createCustomForm");
        var params: any = {
            type: type,
            id: id,
            name: name,
            description: description,
            ref: ref,
        };
        if (showPropChain != undefined) {
            params.showPropChain = showPropChain;
        }
        return this.httpMgr.doPost(this.serviceName, "createCustomForm", params, true);
    }

    /**
     * Creates a new CF cloning an existing CF
     * @param sourceId id of the CF to clone
     * @param targetId id of the CF to create
     */
    cloneCustomForm(sourceId: string, targetId: string) {
        console.log("[CustomFormsServices] cloneCustomForm");
        var params: any = {
            sourceId: sourceId,
            targetId: targetId
        };
        return this.httpMgr.doGet(this.serviceName, "cloneCustomForm", params, true);
    }

    /**
     * Export a CF
     * @param id id of the CF to export
     */
    exportCustomForm(id: string) {
        console.log("[CustomFormsServices] exportCustomForm");
        var params = {
            id: id
        };
        return this.httpMgr.downloadFile(this.serviceName, "exportCustomForm", params);
    }

    /**
     * Imports a CF
     * @param inputFile file of the CF to import 
     * @param newId ID of the new CF (Optional, if not provided it will have the ID of the input CF)
     */
    importCustomForm(inputFile: File, newId?: string) {
        console.log("[CustomFormsServices] importCustomForm");
        var data: any = {
            inputFile: inputFile
        };
        if (newId != null) {
            data.newId = newId;
        }
        return this.httpMgr.uploadFile(this.serviceName, "importCustomForm", data, true);
    }

    /**
     * Deletes the CustomForm with the given ID.
     * @param id the ID of the CustomForm to delete
     */
    deleteCustomForm(id: string, deleteEmptyColl?: boolean) {
        console.log("[CustomFormsServices] deleteCustomForm");
        var params: any = {
            id: id
        };
        if (deleteEmptyColl != undefined) {
            params.deleteEmptyColl = deleteEmptyColl;
        }
        return this.httpMgr.doGet(this.serviceName, "deleteCustomForm", params, true);
    }

    /**
     * Given the id of a CustomForm tells if it belong to a FormCollection
     * @param id the ID of the CustomForm to check
     */
    isFormLinkedToCollection(id: string): Observable<boolean> {
        console.log("[CustomFormsServices] isFormLinkedToCollection");
        var params: any = {
            id: id
        };
        return this.httpMgr.doGet(this.serviceName, "isFormLinkedToCollection", params, true);
    }

    /**
     * Updates attributes of an existing CRE
     * @param id
     * @param name
     * @param description
     * @param ref
     * @param showPropChain
     */
    updateCustomForm(id: string, name: string, description: string, ref: string, showPropChain?: ARTURIResource[]) {
        console.log("[CustomFormsServices] updateCustomForm");
        var params: any = {
            id: id,
            name: name,
            description: description,
            ref: ref,
        };
        if (showPropChain != undefined) {
            params.showPropChain = showPropChain;
        }
        return this.httpMgr.doPost(this.serviceName, "updateCustomForm", params, true);
    }

    /**
	 * Checks if a property chain (manually created by the user) is correct.
	 * Returns an exception if it is not a valid IRI list
	 * @param propertyChain
	 * @return
	 */
    validateShowPropertyChain(propChain: string) {
        console.log("[CustomFormsServices] validateShowPropertyChain");
        var params: any = {
            propChain: propChain
        };
        return this.httpMgr.doGet(this.serviceName, "validateShowPropertyChain", params, true);
    }

    /**
     * Validate a pearl rule. If the rule is syntactically correct return a response, otherwise hanlde an exception.
     * @param pearl rule to be parsed, it should be a whole pearl rule if the CRE is a graph entry
     * or a converter if the CRE is a node entry
     * @param formType tells if the CRE is type "node" or "graph".
     * Determines also the nature of the pearl parameter
     */
    validatePearl(pearl: string, formType: CustomFormType) {
        console.log("[CustomFormsServices] validatePearl");
        var params: any = {
            pearl: pearl,
            formType: formType
        };
        return this.httpMgr.doPost(this.serviceName, "validatePearl", params, true);
    }

    /**
     * Returns a list of BrokenCFStructure that represents the broken FormsMapping, FormCollection and CustomForm
     */
    getBrokenCustomForms(): Observable<BrokenCFStructure[]> {
        console.log("[CustomFormsServices] getBrokenCustomForms");
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getBrokenCustomForms", params, true).map(
            stResp => {
                let brokenCFS: BrokenCFStructure[] = [];
                for (var i = 0; i < stResp.length; i++) {
                    brokenCFS.push({
                        id: stResp[i].id,
                        type: stResp[i].type,
                        level: stResp[i].level,
                        file: stResp[i].file,
                        reason: stResp[i].reason
                    }) 
                }

                //sort by: level then type
                brokenCFS.sort((a: BrokenCFStructure, b: BrokenCFStructure) => {
                    if (a.level == CustomFormLevel.system) {
                        if (b.level == CustomFormLevel.system) {
                            //same level, compare type
                            if (a.type == "FormsMapping") {
                                if (b.type == "FormsMapping") {
                                    return 0;
                                } else {
                                    return -1;
                                }
                            } else if (a.type == "FormCollection") {
                                if (b.type == "FormsMapping") {
                                    return 1;
                                } else if (b.type == "CustomForm") {
                                    return -1;
                                } else {
                                    return 0;
                                }
                            } else { //type CustomForm
                                if (b.type == "CustomForm") {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        } else { //b level project
                            return -1;
                        }
                    } else { // a level project
                        if (b.level == CustomFormLevel.system) {
                            return 1;
                        } else { //same level, compare type
                            if (a.type == "FormsMapping") {
                                if (b.type == "FormsMapping") {
                                    return 0;
                                } else {
                                    return -1;
                                }
                            } else if (a.type == "FormCollection") {
                                if (b.type == "FormsMapping") {
                                    return 1;
                                } else if (b.type == "CustomForm") {
                                    return -1;
                                } else {
                                    return 0;
                                }
                            } else { //type CustomForm
                                if (b.type == "CustomForm") {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        }
                    }
                });

                return brokenCFS;
            }
        );
    }

}
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';
import { ARTLiteral, ARTNode, ARTResource, ARTURIResource, ResAttribute } from "../models/ARTResources";
import { CustomFormValue } from '../models/CustomForms';
import { Deserializer } from '../utils/Deserializer';
import { HttpManager, STRequestParams, VBRequestOptions } from "../utils/HttpManager";
import { VBEventHandler } from '../utils/VBEventHandler';
import { ResourcesServices } from './resourcesServices';

@Injectable()
export class OntoLexLemonServices {

    private serviceName = "OntoLexLemon";

    constructor(private httpMgr: HttpManager, private eventHandler: VBEventHandler, private resourceService: ResourcesServices) { }

    /**
     * Creates a new lime:Lexicon for the provided language.
     * @param language 
     * @param newLexicon 
     * @param title 
     * @param customFormValue 
     */
    createLexicon(language: string, newLexicon?: ARTURIResource, title?: ARTLiteral, customFormValue?: CustomFormValue): Observable<ARTURIResource> {
        let params: STRequestParams = {
            language: language
        };
        if (newLexicon != null) {
            params.newLexicon = newLexicon;
        }
        if (title != null) {
            params.title = title;
        }
        if (customFormValue != null) {
            params.customFormValue = customFormValue;
        }

        return this.httpMgr.doPost(this.serviceName, "createLexicon", params).pipe(
            map(stResp => {
                return Deserializer.createURI(stResp);
            })
        ).pipe(
            mergeMap(lexicon => {
                return this.resourceService.getResourceDescription(lexicon).pipe(
                    map(resource => {
                        resource.setAdditionalProperty(ResAttribute.NEW, true);
                        this.eventHandler.lexiconCreatedEvent.emit(<ARTURIResource>resource);
                        return <ARTURIResource>resource;
                    })
                );
            })
        );
    }

    /**
     * Returns lexicons
     */
    getLexicons(options?: VBRequestOptions): Observable<ARTURIResource[]> {
        let params: STRequestParams = {};
        return this.httpMgr.doGet(this.serviceName, "getLexicons", params, options).pipe(
            map(stResp => {
                let lexicons = Deserializer.createURIArray(stResp);
                return lexicons;
            })
        );
    }

    /**
     * Deletes a lexicon.
     * @param lexicon 
     */
    deleteLexicon(lexicon: ARTURIResource) {
        let params: STRequestParams = {
            lexicon: lexicon
        };
        return this.httpMgr.doPost(this.serviceName, "deleteLexicon", params).pipe(
            map(stResp => {
                this.eventHandler.lexiconDeletedEvent.emit(lexicon);
                return stResp;
            })
        );
    }

    /**
     * 
     * @param lexicon 
     */
    getLexiconLanguage(lexicon: ARTURIResource, options?: VBRequestOptions) {
        let params: STRequestParams = {
            lexicon: lexicon
        };
        return this.httpMgr.doGet(this.serviceName, "getLexiconLanguage", params, options);
    }

    /**
     * Creates a new ontolex:LexicalEntry.
     * @param canonicalForm 
     * @param lexicon 
     * @param newLexicalEntry 
     * @param lexicalEntryCls
     * @param customFormValue 
     */
    createLexicalEntry(canonicalForm: ARTLiteral, lexicon: ARTURIResource, newLexicalEntry?: ARTURIResource, lexicalEntryCls?: ARTURIResource,
        customFormValue?: CustomFormValue): Observable<ARTURIResource> {

        let params: STRequestParams = {
            canonicalForm: canonicalForm,
            lexicon: lexicon
        };
        if (newLexicalEntry != null) {
            params.newLexicalEntry = newLexicalEntry;
        }
        if (lexicalEntryCls != null) {
            params.lexicalEntryCls = lexicalEntryCls;
        }
        if (customFormValue != null) {
            params.customFormValue = customFormValue;
        }
        return this.httpMgr.doPost(this.serviceName, "createLexicalEntry", params).pipe(
            map(stResp => {
                return Deserializer.createURI(stResp);
            })
        ).pipe(
            mergeMap(entry => {
                return this.resourceService.getResourceDescription(entry).pipe(
                    map(resource => {
                        resource.setAdditionalProperty(ResAttribute.NEW, true);
                        this.eventHandler.lexicalEntryCreatedEvent.emit({ entry: (<ARTURIResource>resource), lexicon: lexicon });
                        return <ARTURIResource>resource;
                    })
                );
            })
        );
    }

    /**
     * Returns the entries in a given lexicon that starts with the supplied character.
     * @param index 
     * @param lexicon 
     */
    getLexicalEntriesByAlphabeticIndex(index: string, lexicon?: ARTURIResource, options?: VBRequestOptions): Observable<ARTURIResource[]> {
        let params: STRequestParams = {
            index: index,
            lexicon: lexicon
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalEntriesByAlphabeticIndex", params, options).pipe(
            map(stResp => {
                return Deserializer.createURIArray(stResp);
            })
        );
    }

    /**
     * 
     * @param index 
     * @param lexicon 
     * @param options 
     */
    countLexicalEntriesByAlphabeticIndex(index: string, lexicon?: ARTURIResource, options?: VBRequestOptions): Observable<number> {
        let params: STRequestParams = {
            index: index,
            lexicon: lexicon
        };
        return this.httpMgr.doGet(this.serviceName, "countLexicalEntriesByAlphabeticIndex", params, options);
    }

    /**
     * Returns the lexicon which the lexicalEntry belongs to
     * @param lexicalEntry 
     */
    getLexicalEntryLexicons(lexicalEntry: ARTURIResource, options?: VBRequestOptions): Observable<ARTURIResource[]> {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalEntryLexicons", params, options).pipe(
            map(stResp => {
                return Deserializer.createURIArray(stResp);
            })
        );
    }

    /**
     * Returns the senses of a lexicalEntry
     * @param lexicalEntry 
     */
    getLexicalEntrySenses(lexicalEntry: ARTURIResource): Observable<ARTURIResource[]> {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalEntrySenses", params).pipe(
            map(stResp => {
                return Deserializer.createURIArray(stResp);
            })
        );
    }

    /**
     * Returns the 2-digits index of the given lexicalEntry 
     * @param lexicalEntry 
     */
    getLexicalEntryIndex(lexicalEntry: ARTURIResource, options?: VBRequestOptions): Observable<string> {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalEntryIndex", params, options);
    }

    /**
     * 
     * @param lexicalEntry 
     */
    getLexicalEntryLanguage(lexicalEntry: ARTURIResource): Observable<string> {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalEntryLanguage", params);
    }

    /**
     * 
     * @param lexicalEntry 
     * @param constituentLexicalEntries 
     * @param ordered 
     */
    setLexicalEntryConstituents(lexicalEntry: ARTURIResource, constituentLexicalEntries: ARTURIResource[], ordered: boolean) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            constituentLexicalEntries: constituentLexicalEntries,
            ordered: ordered
        };
        return this.httpMgr.doPost(this.serviceName, "setLexicalEntryConstituents", params);
    }

    /**
     * 
     * @param lexicalEntry 
     */
    clearLexicalEntryConstituents(lexicalEntry: ARTURIResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doPost(this.serviceName, "clearLexicalEntryConstituents", params);
    }


    /**
     * Sets the canonical form of a given lexical entry.
     * @param lexicalEntry 
     * @param writtenRep 
     * @param newForm 
     * @param customFormValue 
     */
    setCanonicalForm(lexicalEntry: ARTURIResource, writtenRep: ARTLiteral, newForm?: ARTURIResource, customFormValue?: CustomFormValue) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            writtenRep: writtenRep
        };
        if (newForm != null) {
            params.newForm = newForm;
        }
        if (customFormValue != null) {
            params.customFormValue = customFormValue;
        }
        return this.httpMgr.doPost(this.serviceName, "setCanonicalForm", params);
    }

    /**
     * Adds an other form of a given lexical entry.
     * @param lexicalEntry 
     * @param writtenRep 
     * @param newForm 
     * @param customFormValue 
     */
    addOtherForm(lexicalEntry: ARTURIResource, writtenRep: ARTLiteral, newForm?: ARTURIResource, customFormValue?: CustomFormValue) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            writtenRep: writtenRep,
            newForm: newForm,
            customFormValue: customFormValue
        };
        return this.httpMgr.doPost(this.serviceName, "addOtherForm", params);
    }

    /**
     * 
     * @param form 
     */
    getFormLanguage(form: ARTResource): Observable<string> {
        let params: STRequestParams = {
            form: form
        };
        return this.httpMgr.doGet(this.serviceName, "getFormLanguage", params);
    }

    /**
     * Removes a form of a lexical entry, and deletes it.
     * @param lexicalEntry 
     * @param property 
     * @param form 
     */
    removeForm(lexicalEntry: ARTResource, property: ARTURIResource, form: ARTResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            property: property,
            form: form
        };
        return this.httpMgr.doPost(this.serviceName, "removeForm", params);
    }

    /**
     * Deletes a lexical entry.
     * @param lexicalEntry 
     */
    deleteLexicalEntry(lexicalEntry: ARTURIResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry
        };
        return this.httpMgr.doPost(this.serviceName, "deleteLexicalEntry", params).pipe(
            map(stResp => {
                this.eventHandler.lexicalEntryDeletedEvent.emit(lexicalEntry);
                return stResp;
            })
        );
    }

    /**
     * Adds a lexicalization of the RDF resource reference using the ontolex:LexicalEntry lexicalEntry. 
     * @param lexicalEntry 
     * @param reference 
     * @param createPlain 
     * @param createSense 
     * @param lexicalSenseCls 
     * @param customFormValue 
     */
    addLexicalization(lexicalEntry: ARTResource, reference: ARTResource, createPlain: boolean, createSense: boolean,
        lexicalSenseCls?: ARTURIResource, customFormValue?: CustomFormValue) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            reference: reference,
            createPlain: createPlain,
            createSense: createSense
        };
        if (lexicalSenseCls != null) {
            params.lexicalSenseCls = lexicalSenseCls;
        }
        if (customFormValue != null) {
            params.customFormValue = customFormValue;
        }
        return this.httpMgr.doPost(this.serviceName, "addLexicalization", params);
    }

    /**
     * Removes a plain lexicalization. This operation removes the triples connecting the lexical entry and the
     * reference in both directions.
     * @param lexicalEntry 
     * @param reference 
     */
    removePlainLexicalization(lexicalEntry: ARTResource, reference: ARTResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            reference: reference,
        };
        return this.httpMgr.doPost(this.serviceName, "removePlainLexicalization", params);
    }

    /**
     * Removes a lexicalization, both its plain and reification through a sense. This operation addresses the triples connecting the
     * related resources in both directions.
     * 
     * @param lexicalEntry 
     * @param reference 
     */
    removeLexicalization(lexicalEntry: ARTResource, reference: ARTResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            reference: reference,
        };
        return this.httpMgr.doPost(this.serviceName, "removeLexicalization", params);
    }

    /**
     * Removes a reified lexicalization expressed as an ontolex:LexicalSense.
     * Optionally, it is possible to remove the corresponding plain lexicalization(s).
     * @param lexicalSense 
     * @param removePlain 
     */
    removeReifiedLexicalization(lexicalSense: ARTResource, removePlain: boolean) {
        let params: STRequestParams = {
            lexicalSense: lexicalSense,
            removePlain: removePlain,
        };
        return this.httpMgr.doPost(this.serviceName, "removeReifiedLexicalization", params);
    }

    /**
     * Adds a representation to an ontolex:Form.
     * @param form 
     * @param representation 
     * @param property 
     */
    addFormRepresentation(form: ARTResource, representation: ARTLiteral, property: ARTURIResource) {
        let params: STRequestParams = {
            form: form,
            representation: representation,
            property: property
        };
        return this.httpMgr.doPost(this.serviceName, "addFormRepresentation", params);
    }

    /**
     * Removes a representations from an ontolex:Form.
     * @param form 
     * @param representation 
     * @param property 
     */
    removeFormRepresentation(form: ARTResource, representation: ARTLiteral, property: ARTURIResource) {
        let params: STRequestParams = {
            form: form,
            representation: representation,
            property: property
        };
        return this.httpMgr.doPost(this.serviceName, "removeFormRepresentation", params);
    }

    updateFormRepresentation(form: ARTResource, representation: ARTLiteral, newRepresentation: ARTLiteral, property: ARTURIResource) {
        let params: STRequestParams = {
            form: form,
            representation: representation,
            newRepresentation: newRepresentation,
            property: property
        };
        return this.httpMgr.doPost(this.serviceName, "updateFormRepresentation", params);
    }

    /**
     * Adds a subterm to an ontolex:LexicalEntry.
     * @param lexicalEntry 
     * @param sublexicalEntry 
     * @param property 
     */
    addSubterm(lexicalEntry: ARTURIResource, sublexicalEntry: ARTURIResource, property?: ARTURIResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            sublexicalEntry: sublexicalEntry
        };
        if (property != null) {
            params.property = property;
        }
        return this.httpMgr.doPost(this.serviceName, "addSubterm", params);
    }

    /**
     * Removes a subterm from an ontolex:LexicalEntry.
     * @param lexicalEntry 
     * @param sublexicalEntry 
     * @param property 
     */
    removeSubterm(lexicalEntry: ARTURIResource, sublexicalEntry: ARTURIResource, property?: ARTURIResource) {
        let params: STRequestParams = {
            lexicalEntry: lexicalEntry,
            sublexicalEntry: sublexicalEntry
        };
        if (property != null) {
            params.property = property;
        }
        return this.httpMgr.doPost(this.serviceName, "removeSubterm", params);
    }

    addConceptualization(lexicalEntry: ARTResource, concept: ARTResource, createPlain: boolean, createSense: boolean,
        lexicalSenseCls?: ARTURIResource, customFormValue?: CustomFormValue) {
        let params = {
            lexicalEntry: lexicalEntry,
            concept: concept,
            createPlain: createPlain,
            createSense: createSense,
            lexicalSenseCls: lexicalSenseCls,
            customFormValue: customFormValue
        };
        return this.httpMgr.doPost(this.serviceName, "addConceptualization", params);
    }

    removePlainConceptualization(lexicalEntry: ARTResource, concept: ARTResource) {
        let params = {
            lexicalEntry: lexicalEntry,
            concept: concept,
        };
        return this.httpMgr.doPost(this.serviceName, "removePlainConceptualization", params);
    }

    removeConceptualization(lexicalEntry: ARTResource, concept: ARTResource) {
        let params = {
            lexicalEntry: lexicalEntry,
            concept: concept,
        };
        return this.httpMgr.doPost(this.serviceName, "removeConceptualization", params);
    }


    removeSense(lexicalSense: ARTResource, removePlain: boolean) {
        let params = {
            lexicalSense: lexicalSense,
            removePlain: removePlain,
        };
        return this.httpMgr.doPost(this.serviceName, "removeSense", params);
    }

    addDefinition(resource: ARTResource, value: ARTLiteral, lexicon?: ARTResource) {
        let params = {
            resource: resource,
            value: value,
            lexicon: lexicon
        };
        return this.httpMgr.doPost(this.serviceName, "addDefinition", params);
    }

    removeDefinition(resource: ARTResource, value: ARTNode, lexicon?: ARTResource) {
        let params = {
            resource: resource,
            value: value,
            lexicon: lexicon
        };
        return this.httpMgr.doPost(this.serviceName, "removeDefinition", params);
    }

    updateDefinition(resource: ARTResource, value: ARTNode, newValue: ARTLiteral, lexicon?: ARTResource) {
        let params = {
            resource: resource,
            value: value,
            newValue: newValue,
            lexicon: lexicon
        };
        return this.httpMgr.doPost(this.serviceName, "updateDefinition", params);
    }


    setReference(lexicalSense: ARTResource, newReference: ARTResource, deletePlain: boolean, createPlain: boolean) {
        let params = {
            lexicalSense: lexicalSense,
            newReference: newReference,
            deletePlain: deletePlain,
            createPlain: createPlain
        };
        return this.httpMgr.doPost(this.serviceName, "setReference", params);
    }

    addConcept(lexicalSense: ARTResource, newConcept: ARTResource, createPlain: boolean) {
        let params = {
            lexicalSense: lexicalSense,
            newConcept: newConcept,
            createPlain: createPlain
        };
        return this.httpMgr.doPost(this.serviceName, "addConcept", params);
    }

    removeConcept(lexicalSense: ARTResource, concept: ARTResource, deletePlain: boolean) {
        let params = {
            lexicalSense: lexicalSense,
            concept: concept,
            deletePlain: deletePlain
        };
        return this.httpMgr.doPost(this.serviceName, "removeConcept", params);
    }

    getLexicalRelationCategories(lexicon?: ARTResource): Observable<ARTURIResource[]> {
        let params = {
            lexicon: lexicon,
        };
        return this.httpMgr.doGet(this.serviceName, "getLexicalRelationCategories", params).pipe(
            map(resp => {
                return Deserializer.createURIArray(resp);
            })
        );
    }

    getSenseRelationCategories(lexicon?: ARTResource): Observable<ARTURIResource[]> {
        let params = {
            lexicon: lexicon,
        };
        return this.httpMgr.doGet(this.serviceName, "getSenseRelationCategories", params).pipe(
            map(resp => {
                return Deserializer.createURIArray(resp);
            })
        );
    }

    getConceptualRelationCategories(lexicon?: ARTResource): Observable<ARTURIResource[]> {
        let params = {
            lexicon: lexicon,
        };
        return this.httpMgr.doGet(this.serviceName, "getConceptualRelationCategories", params).pipe(
            map(resp => {
                return Deserializer.createURIArray(resp);
            })
        );
    }

    createLexicoSemanticRelation(source: ARTResource, target: ARTResource, undirectional: boolean, relationClass: ARTURIResource,
        category?: ARTURIResource, translationSet?: ARTResource): Observable<void> {
        let params = {
            source: source,
            target: target,
            undirectional: undirectional,
            relationClass: relationClass,
            category: category,
            translationSet: translationSet,
        };
        return this.httpMgr.doPost(this.serviceName, "createLexicoSemanticRelation", params);
    }

    deleteLexicalRelation(relation: ARTResource) {
        let params = {
            relation: relation,
        };
        return this.httpMgr.doPost(this.serviceName, "deleteLexicalRelation", params);
    }

    deleteSenseRelation(relation: ARTResource) {
        let params = {
            relation: relation,
        };
        return this.httpMgr.doPost(this.serviceName, "deleteSenseRelation", params);
    }

    createTranslationSet(newTranslationSet?: ARTURIResource, customFormValue?: CustomFormValue): Observable<ARTURIResource> {
        let params = {
            newTranslationSet: newTranslationSet,
            customFormValue: customFormValue
        };
        return this.httpMgr.doPost(this.serviceName, "createTranslationSet", params).pipe(
            map(stResp => {
                return Deserializer.createURI(stResp);
            })
        ).pipe(
            mergeMap(translationSet => {
                return this.resourceService.getResourceDescription(translationSet).pipe(
                    map(resource => {
                        resource.setAdditionalProperty(ResAttribute.NEW, true);
                        this.eventHandler.translationSetCreatedEvent.emit(<ARTURIResource>resource);
                        return <ARTURIResource>resource;
                    })
                );
            })
        );
    }

    getTranslationSets(): Observable<ARTResource[]> {
        let params = {};
        return this.httpMgr.doGet(this.serviceName, "getTranslationSets", params).pipe(
            map(stResp => {
                return Deserializer.createResourceArray(stResp);
            })
        );
    }

    deleteTranslationSet(translationSet: ARTURIResource): Observable<void> {
        let params = {
            translationSet: translationSet,
        };
        return this.httpMgr.doPost(this.serviceName, "deleteTranslationSet", params).pipe(
            map(stResp => {
                this.eventHandler.translationSetDeletedEvent.emit(translationSet);
                return stResp;
            })
        );
    }

}

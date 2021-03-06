import { Component } from "@angular/core";
import { TranslateService } from '@ngx-translate/core';
import { Project, ProjectLabelCtx } from "./models/Project";
import { EDOAL, OntoLex, OWL, RDFS, SKOS } from "./models/Vocabulary";
import { AuthorizationEvaluator } from "./utils/AuthorizationEvaluator";
import { Cookie } from './utils/Cookie';
import { VBActionsEnum } from "./utils/VBActions";
import { VBContext } from "./utils/VBContext";
import { VBEventHandler } from './utils/VBEventHandler';

@Component({
    selector: "app",
    templateUrl: "./appComponent.html",
})
export class AppComponent {

    appVersion = require('../../package.json').version;

    navbarCollapsed: boolean;

    navbarTheme: number = 0;

    constructor(private eventHandler: VBEventHandler, translate: TranslateService) {
        this.eventHandler.themeChangedEvent.subscribe((theme: number) => {
            if (theme != null) {
                this.navbarTheme = theme;
            } else {
                this.navbarTheme = 0;
            }
        });

        //set the available factory-provided l10n languages
        translate.addLangs(['de', 'en', 'es', 'fr', 'it']);
        //add additional supported l10n languages
        let additionalLangs: string[] = window['additional_l10n_langs'];
        if (additionalLangs && additionalLangs.length > 0) {
            translate.addLangs(additionalLangs);
        }
        //fallback when a translation isn't found in the current language
        translate.setDefaultLang('en');
        //restore the lang to use, check first the cookies, if not found or not among the supported, set english by default
        let transLang: string = Cookie.getCookie(Cookie.TRANSLATE_LANG);
        if (transLang == null || !translate.getLangs().includes(transLang)) {
            transLang = "en";
            Cookie.setCookie(Cookie.TRANSLATE_LANG, transLang, null, null, { path: "/" }); //init the cookie
        }
        translate.use(transLang);
        ProjectLabelCtx.language = transLang; //init lang for project rendering

    }


    /**
     * Returns true if the user is logged (an authentication token is stored)
     * Useful to show/hide menubar link
     */
    isUserLogged(): boolean {
        return VBContext.isLoggedIn();
    }

    isUserAdmin(): boolean {
        return VBContext.getLoggedUser().isAdmin();
    }

    /**
     * returns true if a project is open. Useful to show/hide menubar links
     */
    isProjectOpen(): boolean {
        return VBContext.getWorkingProject() != undefined;
    }

    isProjectEdoal(): boolean {
        return VBContext.getWorkingProject().getModelType() == EDOAL.uri;
    }

    /**
     * Returns true if the current open project has history enabled
     */
    isProjectHistoryEnabled(): boolean {
        let wProj: Project = VBContext.getWorkingProject();
        if (wProj != undefined) {
            return wProj.isHistoryEnabled();
        }
        return false;
    }

    /**
     * Returns true if the current open project has validation enabled
     */
    isProjectValidationEnabled(): boolean {
        let wProj: Project = VBContext.getWorkingProject();
        if (wProj != undefined) {
            return wProj.isValidationEnabled();
        }
        return false;
    }

    /**
     * Authorizations
     */

    isSparqlAuthorized() {
        return ( //authorized if one of update or query is authorized
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.sparqlEvaluateQuery) ||
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.sparqlExecuteUpdate)
        );
    }

    isDataAuthorized() {
        let modelType: string = VBContext.getWorkingProject().getModelType();
        if (modelType == EDOAL.uri) {
            return true; //Edoal projects has no capabilities required????
        } else if (modelType == SKOS.uri || modelType == OntoLex.uri) {
            return (
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.skosGetConceptTaxonomy) ||
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.skosGetCollectionTaxonomy) ||
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.skosGetSchemes) ||
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.classesGetClassTaxonomy) ||
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.propertiesGetPropertyTaxonomy)
            );
        } else if (modelType == OWL.uri || modelType == RDFS.uri) {
            return (
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.classesGetClassTaxonomy) ||
                AuthorizationEvaluator.isAuthorized(VBActionsEnum.propertiesGetPropertyTaxonomy)
            );
        }
        return false; //should never happen, no further model is available 
    }

    isMetadataVocAuthorized(): boolean {
        return (
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.datasetMetadataExport) &&
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.datasetMetadataGetMetadata)
        );
    }

    isMetadataRegistryAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(VBActionsEnum.metadataRegistryRead);
    }

    isHistoryAuthorized() {
        return (
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.history) &&
            VBContext.getContextVersion() == null
        );
    }

    isValidationAuthorized() {
        //all user are allowed to see Validation page, further auth checks (is user a validator?) are performed in the Validation page
        return VBContext.getContextVersion() == null;

    }

    isCustomFormAuthorized() {
        return (
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.customFormGetFormMappings) &&
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.customFormGetCollections) &&
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.customFormGetForms)
        );
    }

    isAlignValidationAuthorized() {
        return AuthorizationEvaluator.isAuthorized(VBActionsEnum.alignmentLoadAlignment) &&
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.alignmentApplyAlignment);
    }

    isSheet2RdfAuthorized() {
        return AuthorizationEvaluator.isAuthorized(VBActionsEnum.sheet2Rdf);
    }

    isCollaborationAuthorized() {
        return true;
    }

    isResourceMetadataAuthorized() {
        return AuthorizationEvaluator.isAuthorized(VBActionsEnum.resourceMetadataPatternRead) &&
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.resourceMetadataAssociationRead);
    }

    isCustomServicesAuthorized() {
        return (
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.customServiceRead) ||
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.invokableReporterRead)
        );
    }

    isSkosDiffingAuthorized() {
        return (
            VBContext.getWorkingProject().getModelType() == SKOS.uri
        );
    }

}
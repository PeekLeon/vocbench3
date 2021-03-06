import { Component, ViewChild } from "@angular/core";
import { ModalType } from 'src/app/widget/modal/Modals';
import { SharedModalServices } from 'src/app/widget/modal/sharedModal/sharedModalServices';
import { GraphModalServices } from "../../../graph/modal/graphModalServices";
import { ARTURIResource, RDFResourceRolesEnum } from "../../../models/ARTResources";
import { SearchSettings } from "../../../models/Properties";
import { Vartrans } from "../../../models/Vocabulary";
import { CustomFormsServices } from "../../../services/customFormsServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { SearchServices } from "../../../services/searchServices";
import { VBRequestOptions } from "../../../utils/HttpManager";
import { ResourceUtils, SortAttribute } from "../../../utils/ResourceUtils";
import { RoleActionResolver } from "../../../utils/RoleActionResolver";
import { VBActionFunctionCtx } from "../../../utils/VBActions";
import { VBContext } from "../../../utils/VBContext";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { VBProperties } from "../../../utils/VBProperties";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { MultiSubjectEnrichmentHelper } from "../../multiSubjectEnrichmentHelper";
import { AbstractListPanel } from "../abstractListPanel";
import { TranslationSetListComponent } from "./translationSetListComponent";

@Component({
    selector: "translationset-list-panel",
    templateUrl: "./translationSetListPanelComponent.html",
    host: { class: "vbox" }
})
export class TranslationSetListPanelComponent extends AbstractListPanel {

    @ViewChild(TranslationSetListComponent) viewChildList: TranslationSetListComponent;

    panelRole: RDFResourceRolesEnum = RDFResourceRolesEnum.vartransTranslationSet;

    constructor(private searchService: SearchServices,
        cfService: CustomFormsServices, resourceService: ResourcesServices, basicModals: BasicModalServices, sharedModals: SharedModalServices, graphModals: GraphModalServices,
        eventHandler: VBEventHandler, vbProp: VBProperties, actionResolver: RoleActionResolver, multiEnrichment: MultiSubjectEnrichmentHelper) {
        super(cfService, resourceService, basicModals, sharedModals, graphModals, eventHandler, vbProp, actionResolver, multiEnrichment);
    }

    getActionContext(): VBActionFunctionCtx {
        let actionCtx: VBActionFunctionCtx = { metaClass: Vartrans.TranslationSet, loadingDivRef: this.viewChildList.blockDivElement };
        return actionCtx;
    }

    refresh() {
        this.viewChildList.init();
    }

    //search handlers

    doSearch(searchedText: string) {
        let searchSettings: SearchSettings = VBContext.getWorkingProjectCtx(this.projectCtx).getProjectPreferences().searchSettings;
        let searchLangs: string[];
        let includeLocales: boolean;
        if (searchSettings.restrictLang) {
            searchLangs = searchSettings.languages;
            includeLocales = searchSettings.includeLocales;
        }
        this.searchService.searchResource(searchedText, [RDFResourceRolesEnum.vartransTranslationSet], searchSettings.useLocalName,
            searchSettings.useURI, searchSettings.useNotes, searchSettings.stringMatchMode, searchLangs, includeLocales, null, null,
            VBRequestOptions.getRequestOptions(this.projectCtx)).subscribe(
                searchResult => {
                    if (searchResult.length == 0) {
                        this.basicModals.alert({ key: "SEARCH.SEARCH" }, { key: "MESSAGES.NO_RESULTS_FOUND_FOR", params: { text: searchedText } }, ModalType.warning);
                    } else { //1 or more results
                        if (searchResult.length == 1) {
                            this.openAt(searchResult[0]);
                        } else { //multiple results, ask the user which one select
                            ResourceUtils.sortResources(searchResult, this.rendering ? SortAttribute.show : SortAttribute.value);
                            this.sharedModals.selectResource({ key: "SEARCH.SEARCH" }, { key: "MESSAGES.TOT_RESULTS_FOUND", params: { count: searchResult.length } }, searchResult, this.rendering).then(
                                (selectedResources: ARTURIResource[]) => {
                                    this.openAt(selectedResources[0]);
                                },
                                () => { }
                            );
                        }
                    }
                }
            );
    }

    public openAt(node: ARTURIResource) {
        this.viewChildList.openListAt(node);
    }

}
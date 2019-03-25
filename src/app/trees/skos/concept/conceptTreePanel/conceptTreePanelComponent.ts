import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { OverlayConfig } from 'ngx-modialog';
import { BSModalContextBuilder, Modal } from 'ngx-modialog/plugins/bootstrap';
import { Observable } from "rxjs/Observable";
import { GraphModalServices } from "../../../../graph/modal/graphModalServices";
import { ARTURIResource, RDFResourceRolesEnum, ResAttribute } from "../../../../models/ARTResources";
import { ConceptTreeVisualizationMode, SearchSettings } from "../../../../models/Properties";
import { CustomFormsServices } from "../../../../services/customFormsServices";
import { ResourcesServices } from "../../../../services/resourcesServices";
import { SearchServices } from "../../../../services/searchServices";
import { SkosServices } from "../../../../services/skosServices";
import { AuthorizationEvaluator } from "../../../../utils/AuthorizationEvaluator";
import { ResourceUtils, SortAttribute } from "../../../../utils/ResourceUtils";
import { ActionDescription, RoleActionResolver } from "../../../../utils/RoleActionResolver";
import { UIUtils } from "../../../../utils/UIUtils";
import { VBActionFunctionCtx, VBActionsEnum } from "../../../../utils/VBActions";
import { VBContext } from "../../../../utils/VBContext";
import { VBEventHandler } from "../../../../utils/VBEventHandler";
import { VBProperties } from "../../../../utils/VBProperties";
import { BasicModalServices } from "../../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../../widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "../../../../widget/modal/creationModal/creationModalServices";
import { AbstractTreePanel } from "../../../abstractTreePanel";
import { ConceptTreeComponent } from "../conceptTree/conceptTreeComponent";
import { AddToSchemeModal, AddToSchemeModalData } from "./addToSchemeModal";
import { ConceptTreeSettingsModal } from "./conceptTreeSettingsModal";

@Component({
    selector: "concept-tree-panel",
    templateUrl: "./conceptTreePanelComponent.html",
    host: { class: "vbox" }
})
export class ConceptTreePanelComponent extends AbstractTreePanel {
    @Input() schemes: ARTURIResource[]; //if set the concept tree is initialized with this scheme, otherwise with the scheme from VB context
    @Input() schemeChangeable: boolean = false; //if true, above the tree is shown a menu to select a scheme
    @Output() schemeChanged = new EventEmitter<ARTURIResource>();//when dynamic scheme is changed

    @ViewChild(ConceptTreeComponent) viewChildTree: ConceptTreeComponent

    panelRole: RDFResourceRolesEnum = RDFResourceRolesEnum.concept;

    private modelType: string;

    private schemeList: Array<ARTURIResource>;
    private selectedSchemeUri: string; //needed for the <select> element where I cannot use ARTURIResource as <option> values
    //because I need also a <option> with null value for the no-scheme mode (and it's not possible)
    private workingSchemes: ARTURIResource[];//keep track of the selected scheme: could be assigned throught @Input scheme or scheme selection
    //(useful expecially when schemeChangeable is true so the changes don't effect the scheme in context)

    private visualizationMode: ConceptTreeVisualizationMode;
    
    //for visualization searchBased
    private lastSearch: string;

    constructor(private skosService: SkosServices, private searchService: SearchServices, private creationModals: CreationModalServices,
        cfService: CustomFormsServices, resourceService: ResourcesServices, basicModals: BasicModalServices, graphModals: GraphModalServices,
        eventHandler: VBEventHandler, vbProp: VBProperties, actionResolver: RoleActionResolver,
        private browsingModals: BrowsingModalServices, private modal: Modal) {
        super(cfService, resourceService, basicModals, graphModals, eventHandler, vbProp, actionResolver);

        this.eventSubscriptions.push(eventHandler.schemeChangedEvent.subscribe(
            (schemes: ARTURIResource[]) => this.onSchemeChanged(schemes)));
    }

    ngOnInit() {
        super.ngOnInit();

        this.visualizationMode = this.vbProp.getConceptTreePreferences().visualization;
        this.modelType = VBContext.getWorkingProject().getModelType();
            
        if (this.schemes === undefined) { //if @Input is not provided at all, get the scheme from the preferences
            this.workingSchemes = this.vbProp.getActiveSchemes();
        } else { //if @Input schemes is provided (it could be null => no scheme-mode), initialize the tree with this scheme
            if (this.schemeChangeable) {
                if (this.schemes.length > 0) {
                    this.selectedSchemeUri = this.schemes[0].getURI();
                    this.workingSchemes = [this.schemes[0]];
                } else { //no scheme mode
                    this.selectedSchemeUri = "---"; //no scheme
                    this.workingSchemes = [];
                }
                //init the scheme list if the concept tree allows dynamic change of scheme
                this.skosService.getAllSchemes().subscribe(
                    schemes => {
                        ResourceUtils.sortResources(schemes, this.rendering ? SortAttribute.show : SortAttribute.value);
                        this.schemeList = schemes;
                    }
                );
            } else {
                this.workingSchemes = this.schemes;
            }
        }
    }
    
    //top bar commands handlers

    getActionContext(): VBActionFunctionCtx {
        let metaClass: ARTURIResource = ResourceUtils.convertRoleToClass(this.panelRole, this.modelType);
        let actionCtx: VBActionFunctionCtx = { metaClass: metaClass, loadingDivRef: this.viewChildTree.blockDivElement, schemes: this.workingSchemes }
        return actionCtx;
    }


    //@Override
    isActionDisabled(action: ActionDescription) {
        //In addition to the cross-panel conditions, in this case the actions are disabled if the panel is in no-scheme mode
        return super.isActionDisabled(action) || this.isNoSchemeMode()
    }

    // //@Override
    // isCreateDisabled(): boolean {
    //     return (this.isNoSchemeMode() || this.readonly || !AuthorizationEvaluator.Tree.isCreateAuthorized(this.panelRole));
    // }
    // //@Override
    // isCreateChildDisabled(): boolean {
    //     return (!this.selectedNode || this.isNoSchemeMode() || this.readonly || !AuthorizationEvaluator.Tree.isDeleteAuthorized(this.panelRole));
    // }

    // createRoot() {
    //     let metaClass: ARTURIResource = this.modelType == OntoLex.uri ? OntoLex.lexicalConcept : SKOS.concept;

    //     this.creationModals.newConceptCf("Create new skos:Concept", null, this.workingSchemes, metaClass, true).then(
    //         (data: NewConceptCfModalReturnData) => {
    //             UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
    //             this.skosService.createConcept(data.label, data.schemes, data.uriResource, null, data.cls, null, data.cfValue).subscribe(
    //                 stResp => UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement),
    //                 (err: Error) => {
    //                     if (err.name.endsWith('PrefAltLabelClashException')) {
    //                         this.basicModals.confirm("Warning", err.message + " Do you want to force the creation?", "warning").then(
    //                             confirm => {
    //                                 UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
    //                                 this.skosService.createConcept(data.label, data.schemes, data.uriResource, null, data.cls, null, data.cfValue, false).subscribe(
    //                                     stResp => UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement),
    //                                 );
    //                             },
    //                             reject => {}
    //                         )
    //                     }
    //                 }
    //             );
    //         },
    //         () => { }
    //     );
    // }

    // createChild() {
    //     let metaClass: ARTURIResource = this.modelType == OntoLex.uri ? OntoLex.lexicalConcept : SKOS.concept;

    //     this.creationModals.newConceptCf("Create a skos:narrower", this.selectedNode, null, metaClass, true).then(
    //         (data: NewConceptCfModalReturnData) => {
    //             UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
    //             this.skosService.createConcept(data.label, data.schemes, data.uriResource, this.selectedNode, data.cls, data.broaderProp, data.cfValue).subscribe(
    //                 stResp => UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement),
    //                 (err: Error) => {
    //                     if (err.name.endsWith('PrefAltLabelClashException')) {
    //                         this.basicModals.confirm("Warning", err.message + " Do you want to force the creation?", "warning").then(
    //                             confirm => {
    //                                 this.skosService.createConcept(data.label, data.schemes, data.uriResource, this.selectedNode, data.cls, data.broaderProp, data.cfValue, false).subscribe(
    //                                     stResp => UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement),
    //                                 );
    //                             },
    //                             reject => {}
    //                         )
    //                     }
    //                 }
    //             );
    //         },
    //         () => { }
    //     );
    // }

    // delete() {
    //     if (this.selectedNode.getAdditionalProperty(ResAttribute.MORE)) {
    //         this.basicModals.alert("Operation denied", "Cannot delete " + this.selectedNode.getURI() + 
    //             " since it has narrower concept(s). Please delete the narrower(s) and retry", "warning");
    //         return;
    //     }
    //     UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
    //     this.skosService.deleteConcept(this.selectedNode).subscribe(
    //         stResp => {
    //             this.selectedNode = null;
    //             UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
    //         }
    //     );
    // }

    refresh() {
        if (this.visualizationMode == ConceptTreeVisualizationMode.hierarchyBased) {
            //in index based visualization reinit the list
            this.viewChildTree.init();
        } else if (this.visualizationMode == ConceptTreeVisualizationMode.searchBased) {
            //in search based visualization repeat the search
            if (this.lastSearch != undefined) {
                this.doSearch(this.lastSearch);
            }
        }
    }

    private isNoSchemeMode() {
        return this.workingSchemes.length == 0;
    }

    //scheme selection menu handlers

    /**
     * Listener to <select> element that allows to change dynamically the scheme of the
     * concept tree (visible only if @Input schemeChangeable is true).
     * This is only invokable if schemeChangeable is true, this mode allow only one scheme at time, so can reset workingSchemes
     */
    private onSchemeSelectionChange() {
        var newSelectedScheme: ARTURIResource = this.getSchemeResourceFromUri(this.selectedSchemeUri);
        if (newSelectedScheme != null) { //if it is not "no-scheme"                 
            this.workingSchemes = [newSelectedScheme];
        } else {
            this.workingSchemes = [];
        }
        this.schemeChanged.emit(newSelectedScheme);
    }

    /**
     * Retrieves the ARTURIResource of a scheme URI from the available scheme. Returns null
     * if the URI doesn't represent a scheme in the list.
     */
    private getSchemeResourceFromUri(schemeUri: string): ARTURIResource {
        for (var i = 0; i < this.schemeList.length; i++) {
            if (this.schemeList[i].getURI() == schemeUri) {
                return this.schemeList[i];
            }
        }
        return null; //schemeUri was probably "---", so for no-scheme mode return a null object
    }

    private getSchemeRendering(scheme: ARTURIResource) {
        return ResourceUtils.getRendering(scheme, this.rendering);
    }

    //search handlers

    doSearch(searchedText: string) {
        this.lastSearch = searchedText;

        let searchSettings: SearchSettings = this.vbProp.getSearchSettings();
        let searchLangs: string[];
        let includeLocales: boolean;
        if (searchSettings.restrictLang) {
            searchLangs = searchSettings.languages;
            includeLocales = searchSettings.includeLocales;
        }
        let searchingScheme: ARTURIResource[] = [];
        if (searchSettings.restrictActiveScheme) {
            if (this.schemeChangeable) {
                searchingScheme.push(this.getSchemeResourceFromUri(this.selectedSchemeUri));
            } else {
                searchingScheme = this.workingSchemes;
            }
        }

        UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
        this.searchService.searchResource(searchedText, [RDFResourceRolesEnum.concept], searchSettings.useLocalName, 
            searchSettings.useURI, searchSettings.useNotes, searchSettings.stringMatchMode, searchLangs, includeLocales, searchingScheme).subscribe(
            searchResult => {
                UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
                ResourceUtils.sortResources(searchResult, this.rendering ? SortAttribute.show : SortAttribute.value);
                if (this.visualizationMode == ConceptTreeVisualizationMode.hierarchyBased) {
                    if (searchResult.length == 0) {
                        this.basicModals.alert("Search", "No results found for '" + searchedText + "'", "warning");
                    } else { //1 or more results
                        if (searchResult.length == 1) {
                            this.selectSearchedResource(searchResult[0]);
                        } else { //multiple results, ask the user which one select
                            this.basicModals.selectResource("Search", searchResult.length + " results found.", searchResult, this.rendering).then(
                                (selectedResource: any) => {
                                    this.selectSearchedResource(selectedResource);
                                },
                                () => { }
                            );
                        }
                    }
                } else { //searchBased
                    if (searchResult.length == 0) {
                        this.basicModals.alert("Search", "No results found for '" + searchedText + "'", "warning");
                    }
                    this.viewChildTree.forceList(searchResult);
                }
            }
        );
    }

    public selectSearchedResource(resource: ARTURIResource) {
        this.getSearchedConceptSchemes(resource).subscribe(
            schemes => {
                let isInActiveSchemes: boolean = false;
                if (this.workingSchemes.length == 0) { //no scheme mode -> searched concept should be visible
                    isInActiveSchemes = true;
                } else {
                    for (var i = 0; i < schemes.length; i++) {
                        if (ResourceUtils.containsNode(this.workingSchemes, schemes[i])) {
                            isInActiveSchemes = true;
                            break;
                        }
                    }
                }
                if (isInActiveSchemes) {
                    this.openTreeAt(resource);
                } else {
                    if (schemes.length == 0) { //searched concept doesn't belong to any scheme => ask switch to no-scheme mode
                        this.basicModals.confirm("Search", "Searched concept '" + resource.getShow() + "' does not belong to any scheme. Do you want to switch to no-scheme mode?", "warning").then(
                            confirm => {
                                this.vbProp.setActiveSchemes([]); //update the active schemes
                                /**
                                 * even if workingSchemes will be updated in onSchemeChanged (once the schemeChangedEvent is emitted in
                                 * setActiveSchemes()), I update it here so that the child ConceptTreeComponent detects the change
                                 * of the @Input schemes and in openTreeAt() call getPathFromRoot with the updated schemes
                                 */
                                this.workingSchemes = [];
                                setTimeout(() => {
                                    this.openTreeAt(resource); //then open the tree on the searched resource
                                });
                            },
                            cancel => {}
                        )
                    } else { //searched concept belongs to at least one scheme => ask to activate one of them
                        let message = "Searched concept '" + resource.getShow() + "' is not reachable in the tree since it belongs to the following";
                        if (schemes.length > 1) {
                            message += " schemes. If you want to activate one of these schemes and continue the search, "
                                + "please select the scheme you want to activate and press OK.";
                        } else {
                            message += " scheme. If you want to activate the scheme and continue the search, please select it and press OK.";
                        }
                        this.resourceService.getResourcesInfo(schemes).subscribe(
                            schemes => {
                                this.basicModals.selectResource("Search", message, schemes, this.rendering).then(
                                    (scheme: ARTURIResource) => {
                                        this.vbProp.setActiveSchemes(this.workingSchemes.concat(scheme)); //update the active schemes
                                        /**
                                         * even if workingSchemes will be updated in onSchemeChanged (once the schemeChangedEvent is emitted in
                                         * setActiveSchemes()), I update it here so that the child ConceptTreeComponent detects the change
                                         * of the @Input schemes and in openTreeAt() call getPathFromRoot with the updated schemes
                                         */
                                        this.workingSchemes.push(scheme);
                                        setTimeout(() => {
                                            this.openTreeAt(resource); //then open the tree on the searched resource
                                        });
                                    },
                                    () => {}
                                );
                            }
                        );
                    }
                }
            }
        );
    }

    /**
     * Schemes of a searched concept could be retrieved from a "schemes" attribute (if searched by a "ordinary" search), or from
     * invoking a specific service (if the "schemes" attr is not present when searched by advanced search)
     */
    private getSearchedConceptSchemes(concept: ARTURIResource): Observable<ARTURIResource[]> {
        let schemes: ARTURIResource[] = concept.getAdditionalProperty(ResAttribute.SCHEMES);
        if (schemes == null) {
            return this.skosService.getSchemesOfConcept(concept);
        } else {
            return Observable.of(schemes);
        }
    }

    openTreeAt(resource: ARTURIResource) {
        this.viewChildTree.openTreeAt(resource);
    }

    private settings() {
        const builder = new BSModalContextBuilder<any>();
        let overlayConfig: OverlayConfig = { context: builder.keyboard(27).toJSON() };
        return this.modal.open(ConceptTreeSettingsModal, overlayConfig).result.then(
            changesDone => {
                this.visualizationMode = this.vbProp.getConceptTreePreferences().visualization;
                if (this.visualizationMode == ConceptTreeVisualizationMode.searchBased) {
                    this.viewChildTree.forceList([]);
                    this.lastSearch = null;
                } else {
                    this.refresh();
                }
            },
            () => {}
        );
    }

    private isAddToSchemeEnabled() {
        return this.selectedNode != null && this.isContextDataPanel() && 
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.skosAddMultipleToScheme);
    }
    private addToScheme() {
        this.browsingModals.browseSchemeList("Select scheme").then(
            scheme => {
                var modalData = new AddToSchemeModalData("Add concepts to scheme", this.selectedNode, scheme);
                const builder = new BSModalContextBuilder<AddToSchemeModalData>(
                    modalData, undefined, AddToSchemeModalData
                );
                let overlayConfig: OverlayConfig = { context: builder.keyboard(27).toJSON() };
                return this.modal.open(AddToSchemeModal, overlayConfig).result;
            },
            () => {}
        )
    }

    //EVENT LISTENERS

    //when a concept is removed from a scheme, it should be still visible in res view,
    //but no more selected in the tree if it was in the current scheme 
    private onConceptRemovedFromScheme(concept: ARTURIResource) {
        this.selectedNode = null;
    }

    private onSchemeChanged(schemes: ARTURIResource[]) {
        this.workingSchemes = schemes;
        //in case of visualization search based reset the list
        if (this.visualizationMode == ConceptTreeVisualizationMode.searchBased && this.lastSearch != null) {
            this.viewChildTree.forceList([]);
            this.lastSearch = null;
        }
    }

}
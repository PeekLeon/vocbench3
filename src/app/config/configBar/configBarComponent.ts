import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ARTResource } from "src/app/models/ARTResources";
import { ExportServices } from "src/app/services/exportServices";
import { Cookie } from 'src/app/utils/Cookie';
import { ModalOptions, ModalType } from 'src/app/widget/modal/Modals';
import { VersionInfo } from "../../models/History";
import { Project } from "../../models/Project";
import { AdministrationServices } from "../../services/administrationServices";
import { InputOutputServices } from "../../services/inputOutputServices";
import { PreferencesSettingsServices } from "../../services/preferencesSettingsServices";
import { ShaclServices } from "../../services/shaclServices";
import { LoadShapesModal } from "../../shacl/loadShapesModal";
import { AuthorizationEvaluator } from "../../utils/AuthorizationEvaluator";
import { UIUtils } from "../../utils/UIUtils";
import { VBActionsEnum } from "../../utils/VBActions";
import { VBContext } from "../../utils/VBContext";
import { VBProperties } from "../../utils/VBProperties";
import { BasicModalServices } from "../../widget/modal/basicModal/basicModalServices";
import { SharedModalServices } from "../../widget/modal/sharedModal/sharedModalServices";

@Component({
    selector: "config-bar",
    templateUrl: "./configBarComponent.html",
})
export class ConfigBarComponent {

    private currentProject: Project;

    privacyStatementAvailable: boolean = false;
    private shaclEnabled: boolean = false;

    translateLangs: string[];
    translateLang: string;

    private loadDataAuthorized: boolean;
    private exportDataAuthorized: boolean;
    private clearDataAuthorized: boolean;
    private versioningAuthorized: boolean;
    private wgraphAuthorized: boolean;
    private loadShapesAuthorized: boolean;
    private exportShapesAuthorized: boolean;
    private clearShapesAuthorized: boolean;

    constructor(private exportServices: ExportServices, private inOutService: InputOutputServices, private prefService: PreferencesSettingsServices,
        private administrationService: AdministrationServices, private shaclService: ShaclServices, private vbProp: VBProperties, 
        private basicModals: BasicModalServices, private sharedModals: SharedModalServices, private modalService: NgbModal,
        private translate: TranslateService, private route: Router) {
    }

    ngOnInit() {
        this.translateLangs = this.translate.getLangs();
        this.translateLang = this.translate.currentLang;
    }

    /**
     * returns true if a project is open. Useful to enable/disable navbar links
     */
    isProjectAccessed(): boolean {
        this.currentProject = VBContext.getWorkingProject();
        return VBContext.getWorkingProject() != undefined;
    }

    /**
     * Returns true if the user is logged (an authentication token is stored).
     */
    isUserLogged(): boolean {
        return VBContext.isLoggedIn();
    }

    /* ===============================
     * Project selection
     * =============================== */

    /**
     * Returns the current version of the project
     */
    private getCtxVersion(): VersionInfo {
        return VBContext.getContextVersion();
    }

    /**
     * Returns the current write graph of the project 
     */
    private getCtxWGraph(): ARTResource {
        return VBContext.getContextWGraph();
    }

    /**
     * Opens a modal that allows to change project among the open
     */
    private changeProject() {
        this.sharedModals.changeProject();
    }

    /* ===============================
     * About menu
     * =============================== */

    /**
     * Initializes privacyStatementAvailable. This methods is invoked each time the "About VocBench" menu is open.
     * This is necessary since if privacyStatementAvailable is initialized in ngOnInit(), the system setting migth still not retrieved
     * (in AppComponent.ngOnInit())
     */
    onAboutMenuOpen() {
        this.privacyStatementAvailable = this.vbProp.isPrivacyStatementAvailable();
    }
    private downloadPrivacyStatement() {
        this.administrationService.downloadPrivacyStatement().subscribe();
    }

    /* ===============================
     * Global data management
     * =============================== */

    /**
     * Invoke the initialization of the authorizations of the global data management menu items.
     * This is performed each time the menu is open in order to prevent repeated checks even when not necessary
     */
    private onGlobalDataManagementMenuOpen() {
        this.initAuth();
        this.shaclEnabled = VBContext.getWorkingProject().isShaclEnabled();
    }

    private clearData() {
        this.basicModals.confirm({key:"ACTIONS.CLEAR_DATA"}, {key: "MESSAGES.CLEAR_DATA_CONFIRM"}, ModalType.warning).then(
            () => {
                UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
                this.inOutService.clearData().subscribe(
                    () => {
                        this.prefService.setActiveSchemes().subscribe();
                        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                        this.basicModals.alert({key:"ACTIONS.CLEAR_DATA"}, {key:"MESSAGES.DATA_CLEARED"});
                        //simulate the project change in order to force the destroy of all the Route
                        VBContext.setProjectChanged(true);
                        //redirect to the home in order to prevent any kind of error related to not existing resource
                        this.route.navigate(["/Home"]);
                    }
                );
            },
            () => { }
        );
    }

    private changeWGraph() {
        this.exportServices.getNamedGraphs().subscribe(
            graphs => {
                this.sharedModals.selectResource("Write graph selection", "", graphs, false).then(g => {
                    if (VBContext.getWorkingProject()?.getBaseURI() == g.getNominalValue()) {
                        g = null;
                    }
                    VBContext.setContextWGraph(g);
                    VBContext.setProjectChanged(true); //changing wgraph is equivalent to changing projectv
                    //redirect to the home in order to reset views that were based on the old wgraph
                    this.route.navigate(["/Home"]);
                }, () => { });
            }
        )
    }

    loadShacleShapes() {
        this.modalService.open(LoadShapesModal, new ModalOptions());
    }

    exportShacleShapes() {
        this.shaclService.exportShapes().subscribe(
            blob => {
                var exportLink = window.URL.createObjectURL(blob);
                this.basicModals.downloadLink({ key: "ACTIONS.EXPORT_SHACL_SHAPES" }, null, exportLink, "shapes.ttl");
            }
        )
    }

    clearShacleShapes() {
        this.basicModals.confirm({ key: "ACTIONS.CLEAR_SHACL_SHAPES" }, "This operation will delete all the SHACL shapes stored in the project. Are you sure to proceed?",
            ModalType.warning).then(
            () => {
                UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
                this.shaclService.clearShapes().subscribe(
                    () => {
                        UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                        this.basicModals.alert({ key: "ACTIONS.CLEAR_SHACL_SHAPES" }, {key:"MESSAGES.SHACL_SHAPES_CLEARED"});
                    }
                );
            },
            () => { }
        );
    }

    onTranslateLangChanged() {
        this.translate.use(this.translateLang);
        Cookie.setCookie(Cookie.TRANSLATE_LANG, this.translateLang);
    }

    /* ===============================
     * AUTH
     * =============================== */

    /**
     * Initializes the authorizations of the global data management menu items
     */
    private initAuth() {
        this.loadDataAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.inputOutputLoadData);
        this.exportDataAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.exportExport);
        this.clearDataAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.inputOutputClearData);
        this.versioningAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.versionsGetVersions);
        this.wgraphAuthorized = true; // TODO: replace with proper capability check
        this.loadShapesAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.shaclLoadShapes);
        this.exportShapesAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.shaclExportShapes);
        this.clearShapesAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.shaclClearShapes);
    }

}
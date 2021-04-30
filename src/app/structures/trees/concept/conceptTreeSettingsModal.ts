import { Component } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ARTURIResource } from "../../../models/ARTResources";
import { ConceptTreePreference, ConceptTreeVisualizationMode, MultischemeMode, Properties, VisualizationModeTranslation } from "../../../models/Properties";
import { UsersGroup } from "../../../models/User";
import { SKOS } from "../../../models/Vocabulary";
import { PreferencesSettingsServices } from "../../../services/preferencesSettingsServices";
import { PropertyServices } from "../../../services/propertyServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { ResourceUtils } from "../../../utils/ResourceUtils";
import { VBContext } from "../../../utils/VBContext";
import { VBProperties } from "../../../utils/VBProperties";
import { BrowsingModalServices } from "../../../widget/modal/browsingModal/browsingModalServices";

@Component({
    selector: "concept-tree-settings-modal",
    templateUrl: "./conceptTreeSettingsModal.html",
})
export class ConceptTreeSettingsModal {
    private pristineConcPref: ConceptTreePreference;

    visualization: ConceptTreeVisualizationMode;
    visualizationModes: { value: ConceptTreeVisualizationMode, labelTranslationKey: string }[] = [
        { value: ConceptTreeVisualizationMode.hierarchyBased, labelTranslationKey: VisualizationModeTranslation.translationMap[ConceptTreeVisualizationMode.hierarchyBased] },
        { value: ConceptTreeVisualizationMode.searchBased, labelTranslationKey: VisualizationModeTranslation.translationMap[ConceptTreeVisualizationMode.searchBased] }
    ]

    private safeToGoLimit: number;

    private baseBroaderProp: string;

    private broaderProps: ARTURIResource[] = [];
    private narrowerProps: ARTURIResource[] = [];
    private includeSubProps: boolean
    private syncInverse: boolean;

    private selectedBroader: ARTURIResource;
    private selectedNarrower: ARTURIResource;

    private userGroup: UsersGroup;
    private userGroupBaseBroaderProp: string;

    private multischemeModes: MultischemeMode[] = [MultischemeMode.or, MultischemeMode.and];
    private selectedMultischemeMode: MultischemeMode;

    constructor(public activeModal: NgbActiveModal, private resourceService: ResourcesServices, private propService: PropertyServices,
        private prefService: PreferencesSettingsServices, private vbProp: VBProperties, private browsingModals: BrowsingModalServices) {}

    ngOnInit() {
        let conceptTreePref: ConceptTreePreference = VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences;
        this.pristineConcPref = JSON.parse(JSON.stringify(conceptTreePref));

        this.selectedMultischemeMode = conceptTreePref.multischemeMode;

        this.safeToGoLimit = conceptTreePref.safeToGoLimit;
        
        this.baseBroaderProp = conceptTreePref.baseBroaderUri;

        //init broader properties
        this.initBroaderProps(conceptTreePref.broaderProps);

        //init narrower properties
        this.initNarrowerProps(conceptTreePref.narrowerProps);

        this.includeSubProps = conceptTreePref.includeSubProps;
        this.syncInverse = conceptTreePref.syncInverse;

        this.visualization = conceptTreePref.visualization;

        this.userGroup = VBContext.getProjectUserBinding().getGroup();
        //in case of userGroup get the baseBroaderProp of the group
        if (this.userGroup != null) { 
            this.prefService.getPGSettings([Properties.pref_concept_tree_base_broader_prop], this.userGroup.iri, VBContext.getWorkingProject()).subscribe(
                prefs => {
                    this.userGroupBaseBroaderProp = prefs[Properties.pref_concept_tree_base_broader_prop];
                }
            );
        }
    }

    private initBroaderProps(broadersPropsPref: string[]) {
        if (broadersPropsPref.length > 0) {
            let broadersTemp: ARTURIResource[] = [];
            broadersPropsPref.forEach((propUri: string) => {
                broadersTemp.push(new ARTURIResource(propUri));
            });
            this.resourceService.getResourcesInfo(broadersTemp).subscribe(
                resources => {
                    this.broaderProps = <ARTURIResource[]>resources;
                }
            );
        }
    }

    private initNarrowerProps(narrowersPropsPref: string[]) {
        if (narrowersPropsPref.length > 0) {
            let narrowersTemp: ARTURIResource[] = [];
            narrowersPropsPref.forEach((propUri: string) => {
                narrowersTemp.push(new ARTURIResource(propUri));
            });
            this.resourceService.getResourcesInfo(narrowersTemp).subscribe(
                resources => {
                    this.narrowerProps = <ARTURIResource[]>resources;
                }
            );
        }
    }

    /**
     * BASE BROADER HANDLERS
     */

    private changeBaseBroaderProperty() {
        let rootBroader: ARTURIResource = SKOS.broader;
        if (this.userGroup != null) {
            rootBroader = new ARTURIResource(this.userGroupBaseBroaderProp);
        }
        this.browsingModals.browsePropertyTree({key:"DATA.ACTIONS.SELECT_PROPERTY"}, [rootBroader]).then(
            (prop: ARTURIResource) => {
                this.baseBroaderProp = prop.getURI();
            },
            () => {}
        );
    }

    /**
     * BROADER/NARROWER PROPRETIES
     */

    private addBroader() {
        this.browsingModals.browsePropertyTree({key:"DATA.ACTIONS.SELECT_PROPERTY"}, [SKOS.broader]).then(
            (prop: ARTURIResource) => {
                if (!ResourceUtils.containsNode(this.broaderProps, prop)) {
                    this.broaderProps.push(prop);
                    //if synchronization is active sync the lists
                    if (this.syncInverse) {
                        this.syncProps();
                    }
                }
            },
            () => {}
        )
    }

    private addNarrower() {
        this.browsingModals.browsePropertyTree({key:"DATA.ACTIONS.SELECT_PROPERTY"}, [SKOS.narrower]).then(
            (prop: ARTURIResource) => {
                if (!ResourceUtils.containsNode(this.narrowerProps, prop)) {
                    this.narrowerProps.push(prop);
                    //if synchronization is active sync the lists
                    if (this.syncInverse) {
                        this.syncProps();
                    }
                }
            },
            () => {}
        )
    }

    private removeBroader() {
        this.broaderProps.splice(this.broaderProps.indexOf(this.selectedBroader), 1);
        //if synchronization is active sync the lists
        if (this.syncInverse) {
            this.propService.getInverseProperties([this.selectedBroader]).subscribe(
                (inverseProps: ARTURIResource[]) => {
                    inverseProps.forEach((prop: ARTURIResource) => {
                        let idx = ResourceUtils.indexOfNode(this.narrowerProps, prop);
                        if (idx != -1) {
                            this.narrowerProps.splice(idx, 1);
                        }
                    });
                }
            );
        }
        this.selectedBroader = null;
    }

    private removeNarrower() {
        this.narrowerProps.splice(this.narrowerProps.indexOf(this.selectedNarrower), 1);
        //if synchronization is active sync the lists
        if (this.syncInverse) {
            this.propService.getInverseProperties([this.selectedNarrower]).subscribe(
                (inverseProps: ARTURIResource[]) => {
                    inverseProps.forEach((prop: ARTURIResource) => {
                        let idx = ResourceUtils.indexOfNode(this.broaderProps, prop);
                        if (idx != -1) {
                            this.broaderProps.splice(idx, 1);
                        }
                    });
                }
            );
        }
        this.selectedNarrower = null;
    }

    private onSyncChange() {
        //if sync inverse properties change from false to true perform a sync
        if (this.syncInverse) {
            this.syncProps();
        }
    }

    private syncProps() {
        if (this.broaderProps.length > 0) {
            this.propService.getInverseProperties(this.broaderProps).subscribe(
                (inverseProps: ARTURIResource[]) => {
                    inverseProps.forEach((narrowerProp: ARTURIResource) => {
                        if (!ResourceUtils.containsNode(this.narrowerProps, narrowerProp)) { //invers is not already among the narrowerProps
                            let broaderPropUri: string = narrowerProp.getAdditionalProperty("inverseOf");
                            //add it at the same index of its inverse prop
                            let idx: number = ResourceUtils.indexOfNode(this.broaderProps, new ARTURIResource(broaderPropUri));
                            this.narrowerProps.splice(idx, 0, narrowerProp);
                        }
                    });
                }
            )
        }
        if (this.narrowerProps.length > 0) {
            this.propService.getInverseProperties(this.narrowerProps).subscribe(
                (inverseProps: ARTURIResource[]) => {
                    inverseProps.forEach((broaderProp: ARTURIResource) => {
                        if (!ResourceUtils.containsNode(this.broaderProps, broaderProp)) { //invers is not already among the broaderProps
                            let narrowerPropUri: string = broaderProp.getAdditionalProperty("inverseOf");
                            //add it at the same index of its inverse prop
                            let idx: number = ResourceUtils.indexOfNode(this.narrowerProps, new ARTURIResource(narrowerPropUri));
                            this.broaderProps.splice(idx, 0, broaderProp);
                        }
                    });
                }
            )
        }
    }

    //=======================

    private applyGroupSettings() {
        var properties: string[] = [
            Properties.pref_concept_tree_base_broader_prop, Properties.pref_concept_tree_broader_props, Properties.pref_concept_tree_narrower_props,
            Properties.pref_concept_tree_include_subprops, Properties.pref_concept_tree_sync_inverse
        ];
        this.prefService.getPGSettings(properties, this.userGroup.iri, VBContext.getWorkingProject()).subscribe(
            prefs => {
                let conceptTreeBaseBroaderPropPref: string = prefs[Properties.pref_concept_tree_base_broader_prop];
                if (conceptTreeBaseBroaderPropPref != null) {
                    this.baseBroaderProp = conceptTreeBaseBroaderPropPref;
                } else {
                    this.baseBroaderProp = SKOS.broader.getURI();
                }
                let conceptTreeBroaderPropsPref: string = prefs[Properties.pref_concept_tree_broader_props];
                if (conceptTreeBroaderPropsPref != null) {
                    this.initBroaderProps(conceptTreeBroaderPropsPref.split(","));
                } else {
                    this.broaderProps = [];
                }
                let conceptTreeNarrowerPropsPref: string = prefs[Properties.pref_concept_tree_narrower_props];
                if (conceptTreeNarrowerPropsPref != null) {
                    this.initNarrowerProps(conceptTreeNarrowerPropsPref.split(","));
                } else {
                    this.narrowerProps = [];
                }
                this.includeSubProps = prefs[Properties.pref_concept_tree_include_subprops] != "false";
                this.syncInverse = prefs[Properties.pref_concept_tree_sync_inverse] != "false";
            }
        );
    }


    ok() {

        let changedVisualization = this.pristineConcPref.visualization != this.visualization;
        let changedMultischemeMode: boolean;
        let changedSafeToGoLimit: boolean;
        let changedBaseBroaderUri: boolean;
        let changedIncludeSubProps: boolean;
        let changedSyncInverse: boolean;
        let changedBroaderProps: boolean;
        let changedNarrowerProps: boolean;

        if (this.visualization == ConceptTreeVisualizationMode.hierarchyBased) {
            changedMultischemeMode = this.pristineConcPref.multischemeMode != this.selectedMultischemeMode;
            changedSafeToGoLimit = this.pristineConcPref.safeToGoLimit != this.safeToGoLimit;
            changedBaseBroaderUri = this.pristineConcPref.baseBroaderUri != this.baseBroaderProp;
            changedIncludeSubProps = this.pristineConcPref.includeSubProps != this.includeSubProps;
            changedSyncInverse = this.pristineConcPref.syncInverse != this.syncInverse;

            //look for changes in broaderProps:
            //first compare lenght
            changedBroaderProps = this.pristineConcPref.broaderProps.length != this.broaderProps.length;
            //eventually check if every property in the pristine collection is still in the current collection (properties removed?)...
            if (!changedBroaderProps) {
                //there is some property in the pristine broaderProps that is not in the new broaderProps list
                changedBroaderProps = this.pristineConcPref.broaderProps.some(bp => !ResourceUtils.containsNode(this.broaderProps, new ARTURIResource(bp)));
            }
            //...and finally check if every property in the current was in the pristine (properties added?)
            if (!changedBroaderProps) {
                changedBroaderProps = this.broaderProps.some(bp => this.pristineConcPref.broaderProps.indexOf(bp.toNT()) == -1);
            }

            //look for changes in narrowerProps:
            //first compare lenght
            changedNarrowerProps = this.pristineConcPref.narrowerProps.length != this.narrowerProps.length;
            //eventually check if every property in the pristine collection is still in the current collection (properties removed?)...
            if (!changedNarrowerProps) {
                //there is some property in the pristine narrowerProps that is not in the new narrowerProps list
                changedNarrowerProps = this.pristineConcPref.narrowerProps.some(np => !ResourceUtils.containsNode(this.narrowerProps, new ARTURIResource(np)))
            }
            //...and finally check if every property in the current was in the pristine (properties added?)
            if (!changedNarrowerProps) {
                //there is some property in the new narrowerProps that is not in the pristine narrowerProps
                changedNarrowerProps = this.narrowerProps.some(np => this.pristineConcPref.narrowerProps.indexOf(np.toNT()) == -1);
            }
        }

        /**
         * If settings are changed, store them and close the dialog so that the tree refreshes, otherwise cancel.
         * Actually the only changes that requires the refresh are:
         * - the broader/narrower props
         * - includeSubProps 
         * - visualization
         * but, in order to make it easy, just check if just one setting has changed
         */
        if (
            changedBaseBroaderUri || changedBroaderProps || changedIncludeSubProps || changedMultischemeMode ||
            changedNarrowerProps || changedSafeToGoLimit || changedSyncInverse || changedVisualization
        ) {
            let concTreePrefs: ConceptTreePreference = new ConceptTreePreference();
            concTreePrefs.baseBroaderUri = this.baseBroaderProp;
            concTreePrefs.broaderProps = this.broaderProps.map((prop: ARTURIResource) => prop.toNT());
            concTreePrefs.includeSubProps = this.includeSubProps;
            concTreePrefs.multischemeMode = this.selectedMultischemeMode;
            concTreePrefs.narrowerProps = this.narrowerProps.map((prop: ARTURIResource) => prop.toNT());
            concTreePrefs.safeToGoLimit = this.safeToGoLimit;
            concTreePrefs.syncInverse = this.syncInverse;
            concTreePrefs.visualization = this.visualization;
            this.vbProp.setConceptTreePreferences(concTreePrefs);
            this.activeModal.close();
        } else {
            this.cancel();
        }

    }

    cancel() {
        this.activeModal.dismiss();
    }

}
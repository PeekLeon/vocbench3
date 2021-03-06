import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs/operators';
import { ModalOptions, ModalType } from 'src/app/widget/modal/Modals';
import { Language, Languages } from "../../../models/LanguagesCountries";
import { AlignmentPlan, AlignmentScenario, ConceptualizationSet, LexicalizationSet, Lexicon, MatcherDefinitionDTO, MatcherDTO, Pairing, RefinablePairing, ScenarioDefinition, ServiceMetadataDTO, Synonymizer } from "../../../models/Maple";
import { Project } from "../../../models/Project";
import { MapleServices } from "../../../services/mapleServices";
import { ProjectServices } from "../../../services/projectServices";
import { RemoteAlignmentServices } from "../../../services/remoteAlignmentServices";
import { HttpServiceContext } from "../../../utils/HttpManager";
import { UIUtils } from "../../../utils/UIUtils";
import { VBContext } from "../../../utils/VBContext";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { SharedModalServices } from "../../../widget/modal/sharedModal/sharedModalServices";
import { SynonymizerDetailsModal } from "./synonymizerDetailsModal";

@Component({
    selector: "create-alignment-task-modal",
    templateUrl: "./createRemoteAlignmentTaskModal.html",
    host: { class: "blockingDivHost" },
})
export class CreateRemoteAlignmentTaskModal {
    @Input() leftProject: Project;
    @Input() rightProject: Project;

    @ViewChild('blockingDiv', { static: true }) public blockingDivElement: ElementRef;

    projectList: Project[];
    selectedRightProject: Project;

    leftProjectStruct: AlignedProjectStruct;
    rightProjectStruct: AlignedProjectStruct;

    alignmentScenario: AlignmentScenario;
    private refinablePairings: ResolvedPairing[];

    serviceMetadata: ServiceMetadataDTO;

    private matchers: MatcherDTO[];
    private selectedMatcher: MatcherDTO;

    /* when the pairing selection changes, the matchers list (eventually initialized) could be outdated.
    In order to check this, each time the matchers search is performed, lastPairingSignatureForMatchers is computed.
    Then, when a pairing is selected/deselected, a new signature is computed and compared with the previous.
    In case the two signatures differ, the matchers list is marked as outdated.
    The signature is computed with a comma-separated list of true/false according if the pairing are selected/deselected
    */
    private lastPairingSignatureForMatchers: string;
    private outdatedMatchers: boolean = false;

    constructor(public activeModal: NgbActiveModal, private projectService: ProjectServices,
        private mapleService: MapleServices, private remoteAlignmentService: RemoteAlignmentServices, private basicModals: BasicModalServices,
        private sharedModals: SharedModalServices, private modalService: NgbModal) {
    }

    ngOnInit() {
        //TODO in production, 2nd parameter should be true? the target dataset should be user dependent?
        this.projectService.listProjects(VBContext.getWorkingProject(), false, true).subscribe(
            projects => {
                this.projectList = projects.filter(p => p.getRepositoryLocation().location == "remote");
                if (this.rightProject != null) {
                    this.selectedRightProject = this.projectList.find(p => p.getName() == this.rightProject.getName());
                    if (this.selectedRightProject != null) {
                        this.onRightProjectChange();
                    }
                }
            }
        );
        this.leftProjectStruct = new AlignedProjectStruct();
        this.leftProjectStruct.project = this.leftProject;
        this.initProjectStruct(this.leftProjectStruct);


        this.remoteAlignmentService.getServiceMetadata().subscribe(
            serviceMetadata => {
                this.serviceMetadata = serviceMetadata;
                /* if the service settings are not expressed as Settings (in stProperties), they will be edited through json editor,
                * so initialize the settings to manually enter through the json-editor */
                if (this.serviceMetadata.settings) {
                    this.serviceMetadata.settings['settingsJson'] = JSON.stringify({});
                    //add also the schema to show to the user
                    this.serviceMetadata.settings['originalSchemaJson'] = JSON.stringify(this.serviceMetadata.settings.originalSchema, null, 2);
                }
            }
        );

    }

    //========== Datasets handlers ===========

    onRightProjectChange() {
        this.rightProjectStruct = new AlignedProjectStruct();
        this.rightProjectStruct.project = this.selectedRightProject;
        this.initProjectStruct(this.rightProjectStruct);

        //reset the status of alignment
        this.alignmentScenario = null;
        this.matchers = null;
        this.selectedMatcher = null;
    }

    private initProjectStruct(projStruct: AlignedProjectStruct) {
        HttpServiceContext.setContextProject(projStruct.project);
        this.mapleService.checkProjectMetadataAvailability().pipe(
            finalize(() => HttpServiceContext.removeContextProject())
        ).subscribe(
            available => {
                projStruct.profileAvailable = available;
            }
        );
    }

    profileProject(projStruct: AlignedProjectStruct) {
        if (projStruct.profileAvailable) {
            this.basicModals.confirm({ key: "ACTIONS.PROFILE_PROJECT" }, { key: "MESSAGES.PROFILE_PROJECT_REFRESH_CONFIRM", params: { project: projStruct.project.getName() } },
                ModalType.warning).then(
                    () => {
                        this.profileProjectImpl(projStruct);
                    },
                    () => { }
                );
        } else {
            this.profileProjectImpl(projStruct);
        }
    }
    
    private profileProjectImpl(projStruct: AlignedProjectStruct) {
        UIUtils.startLoadingDiv(this.blockingDivElement.nativeElement);
        HttpServiceContext.setContextProject(projStruct.project);
        this.mapleService.profileProject().pipe(
            finalize(() => HttpServiceContext.removeContextProject())
        ).subscribe(
            () => {
                UIUtils.stopLoadingDiv(this.blockingDivElement.nativeElement);
                projStruct.profileAvailable = true;
            }
        );
    }

    //========== Matching profilation handlers ===========

    isProfileEnabled() {
        return (
            this.leftProjectStruct.profileAvailable &&
            this.rightProjectStruct != null && this.rightProjectStruct.profileAvailable
        );
    }

    profileMatching() {
        this.mapleService.profileMatchingProblemBetweenProjects(this.leftProjectStruct.project, this.rightProjectStruct.project).subscribe(
            scenario => {
                /**
                 * profileMatchingProblemBetweenProjects return a AlignmentScenario which contains a list of RefinablePairing.
                 * Each pairing has a list of synonymizers, only one of them should be chosen for the task creation.
                 * In order to support the UI, here the pairings are mapped into a list of ResolvedPairing which contains useful info.
                 */
                this.alignmentScenario = scenario;
                this.refinablePairings = [];
                this.alignmentScenario.pairings.forEach(p => {
                    let synonymizers: ResolvedSynonymizer[] = [];
                    p.synonymizers.forEach(s => {
                        let syn: ResolvedSynonymizer = {
                            score: s.score,
                            scoreRound: Math.round((s.score + Number.EPSILON) * 1000) / 1000,
                            conceptualizationSet: s.conceptualizationSet,
                            conceptualizationSetDataset: <ConceptualizationSet>this.alignmentScenario.supportDatasets.find(d => d["@id"] == s.conceptualizationSet),
                            lexicon: s.lexicon,
                            lexiconDataset: <Lexicon>this.alignmentScenario.supportDatasets.find(d => d["@id"] == s.lexicon),
                            language: null,
                        };
                        syn.language = Languages.getLanguageFromTag(syn.lexiconDataset.languageTag);
                        synonymizers.push(syn);
                    });
                    let rp: ResolvedPairing = {
                        score: p.score,
                        scoreRound: Math.round((p.score + Number.EPSILON) * 1000) / 1000,
                        bestCombinedScore: p.bestCombinedScore,
                        bestCombinedScoreRound: Math.round((p.bestCombinedScore + Number.EPSILON) * 1000) / 1000,
                        source: p.source,
                        sourceLexicalizationSet: <LexicalizationSet>this.alignmentScenario.supportDatasets.find(d => d["@id"] == p.source.lexicalizationSet),
                        target: p.target,
                        targetLexicalizationSet: <LexicalizationSet>this.alignmentScenario.supportDatasets.find(d => d["@id"] == p.target.lexicalizationSet),
                        synonymizers: synonymizers,
                        language: null,
                        checked: false,
                        selectedSynonymizer: null
                    };
                    rp.language = Languages.getLanguageFromTag(rp.sourceLexicalizationSet.languageTag);
                    this.refinablePairings.push(rp);
                });
                //initialize as selected pairing the one with the highest score
                if (this.refinablePairings.length > 0) {
                    let bestScore = Math.max(...this.refinablePairings.map(p => p.score));
                    this.refinablePairings.find(p => p.score == bestScore).checked = true;
                }
            }
        );
    }

    selectSynonymizer(pairing: ResolvedPairing, synonymizer: ResolvedSynonymizer) {
        if (pairing.selectedSynonymizer == synonymizer) {
            pairing.selectedSynonymizer = null;
        } else {
            pairing.selectedSynonymizer = synonymizer;
        }
    }

    describeSynonymizer(synonymizer: ResolvedSynonymizer) {
        //open a modal that show the lexicon and the conceptualization set of the synonymizer
        const modalRef: NgbModalRef = this.modalService.open(SynonymizerDetailsModal, new ModalOptions());
        modalRef.componentInstance.synonymizer = synonymizer;
    }

    onPairingSelectionChange() {
        //when a pairing is selected/deselected, the matchers listed (if any) could be outdated
        if (this.matchers != null) {
            let pairingSignature = this.refinablePairings.map(p => p.checked + "").join(",");
            this.outdatedMatchers = (this.lastPairingSignatureForMatchers != pairingSignature);
        }
    }

    //========== Matchers ===========

    searchMatchers() {
        let scenarioDef: ScenarioDefinition = this.getScenarioDefinition();
        if (scenarioDef.pairings.length == 0) {
            this.basicModals.alert({ key: "STATUS.WARNING" }, { key: "MESSAGES.PAIRING_SELECTION_REQUIRED" }, ModalType.warning);
            return;
        }
        this.lastPairingSignatureForMatchers = this.refinablePairings.map(p => p.checked + "").join(",");
        this.remoteAlignmentService.searchMatchers(scenarioDef).subscribe(
            matchers => {
                this.matchers = matchers;
                /* if the matchers settings are not expressed as Settings (in stProperties), they will be edited through json editor,
                * so initialize a json settings string to be edited */
                this.matchers.forEach(m => {
                    if (m.settings) {
                        m.settings['settingsJson'] = JSON.stringify({});
                        //add also the schema to show to the user
                        m.settings['originalSchemaJson'] = JSON.stringify(m.settings.originalSchema, null, 2);
                    }
                });
                this.outdatedMatchers = false;
            }
        );
    }

    selectMatcher(matcher: MatcherDTO) {
        this.selectedMatcher = (this.selectedMatcher == matcher) ? null : matcher;
    }

    //========== Utils ===========

    /**
     * Returns the scenario definition with the current choices made by the user.
     * Note: in order to generate a scenario definition is mandatory that at least a pairing is selected.
     * So this method should be invoked only when this requirement is satisfied.
     * (in order to do that enable/disable buttons accordingly)
     */
    private getScenarioDefinition(): ScenarioDefinition {
        /**
         * First map the enabled refinable pairings into a Pairing list.
         * A Pairing, unlike the RefinablePairing, has only one (optional) synonymizer. 
         * This synonymizer is set in the Pairing only if a synonymizer is selected among those available in the RefinablePairing
         */
        let pairings: Pairing[] = [];
        this.refinablePairings.forEach(p => {
            if (p.checked) {
                let pairing: Pairing = {
                    score: p.score,
                    source: p.source,
                    target: p.target,
                    synonymizer: null
                };
                if (p.selectedSynonymizer != null) {
                    let synonymizer: Synonymizer = {
                        score: p.selectedSynonymizer.score,
                        conceptualizationSet: p.selectedSynonymizer.conceptualizationSet,
                        lexicon: p.selectedSynonymizer.lexicon
                    };
                    pairing.synonymizer = synonymizer;
                }
                pairings.push(pairing);
            }
        });
        return {
            leftDataset: this.alignmentScenario.leftDataset,
            rightDataset: this.alignmentScenario.rightDataset,
            supportDatasets: this.alignmentScenario.supportDatasets,
            pairings: pairings,
            alignmentChains: this.alignmentScenario.alignmentChains
        };
    }


    //================================

    systemSettings() {
        this.sharedModals.configurePlugin(this.serviceMetadata.settings.stProperties).then(
            newSettings => {
                this.serviceMetadata.settings.stProperties = newSettings;
            },
            () => { }
        );
    }

    isOkEnabled() {
        return this.alignmentScenario != null;
    }

    ok() {
        /**
         * prepare the alignmentPlan to provide to createTask service which includes
         * - scenario definition
         * - settings (optionally)
         * - matcherDefinition (optionally)
         */
        let scenarioDef: ScenarioDefinition = this.getScenarioDefinition();
        let matcherDefinition: MatcherDefinitionDTO;
        if (this.selectedMatcher != null) { //if a matcher is selected, create its definition
            let matcherSettings: any;
            if (this.selectedMatcher.settings != null) { //if settings are available
                if (this.selectedMatcher.settings.stProperties != null) { //get them from the stProperties
                    matcherSettings = this.selectedMatcher.settings.stProperties.getPropertiesAsMap();
                } else { //or from the originalSchema
                    let parsedSettings: any;
                    try {
                        parsedSettings = JSON.parse(this.selectedMatcher.settings['settingsJson']);
                    } catch (err) {
                        this.basicModals.alert({ key: "STATUS.INVALID_VALUE" }, { key: "MESSAGES.CANNOT_PARSE_JSON_MATCHER_CONFIGURATION" }, ModalType.warning);
                        return;
                    }
                    matcherSettings = parsedSettings;
                }
            }
            matcherDefinition = {
                id: this.selectedMatcher.id,
                settings: matcherSettings
            };
        }

        let serviceSettings: any;
        if (this.serviceMetadata && this.serviceMetadata.settings != null) { //if settings are available
            if (this.serviceMetadata.settings.stProperties != null) { //get them from the stProperties
                serviceSettings = this.serviceMetadata.settings.stProperties.getPropertiesAsMap();
            } else { //or from the originalSchema
                let parsedSettings: any;
                try {
                    parsedSettings = JSON.parse(this.serviceMetadata.settings['settingsJson']);
                } catch (err) {
                    this.basicModals.alert({ key: "STATUS.INVALID_VALUE" }, { key: "MESSAGES.CANNOT_PARSE_JSON_METADATA_SETTING" }, ModalType.warning);
                    return;
                }
                serviceSettings = parsedSettings;
            }
        }

        let alignmentPlan: AlignmentPlan = {
            scenarioDefinition: scenarioDef,
            matcherDefinition: matcherDefinition,
            settings: serviceSettings,
        };
        this.remoteAlignmentService.createTask(alignmentPlan).subscribe(
            taskId => {
                this.activeModal.close(taskId);
            }
        );
    }

    cancel() {
        this.activeModal.dismiss();
    }

}

class AlignedProjectStruct {
    project: Project;
    profileAvailable: boolean = false;
}

/**
 * The following class extend the structure of RefinablePairing and Synonymizer with the addition of useful info (language) and
 * with the referenced dataset (lexicon, lexicalization set, conceptualization set) resolved with the Dataset object replacing the sole id
 */
class ResolvedPairing extends RefinablePairing {
    // score: number;
    // source: PairingHand;
    // target: PairingHand;
    synonymizers: ResolvedSynonymizer[];
    scoreRound: number;
    bestCombinedScore: number;
    bestCombinedScoreRound: number;
    sourceLexicalizationSet: LexicalizationSet; //retrieved looking for the source.lexicalizationSet in the supportDatasets
    targetLexicalizationSet: LexicalizationSet; //retrieved looking for the target.lexicalizationSet in the supportDatasets
    language: Language; //language of the lexicalization sets (it's the same for both)
    checked: boolean; //if the pairing is selected to be used
    selectedSynonymizer: ResolvedSynonymizer; //the synonymizer to use of the pairing
}
export class ResolvedSynonymizer extends Synonymizer {
    // lexicon: string;
    // conceptualizationSet: string;
    // score: number;
    scoreRound: number;
    lexiconDataset: Lexicon;
    conceptualizationSetDataset: ConceptualizationSet;
    language: Language;
}
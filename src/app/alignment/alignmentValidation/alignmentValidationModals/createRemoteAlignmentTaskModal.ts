import { Component, ElementRef, ViewChild } from "@angular/core";
import { DialogRef, Modal, ModalComponent, OverlayConfig } from 'ngx-modialog';
import { BSModalContext, BSModalContextBuilder } from 'ngx-modialog/plugins/bootstrap';
import { Language, Languages } from "../../../models/LanguagesCountries";
import { ConceptualizationSet, LexicalizationSet, Lexicon, Pairing, RefinablePairing, RefinableTaskReport, Synonymizer, TaskReport } from "../../../models/Maple";
import { Project } from "../../../models/Project";
import { MapleServices } from "../../../services/mapleServices";
import { ProjectServices } from "../../../services/projectServices";
import { RemoteAlignmentServices } from "../../../services/remoteAlignmentServices";
import { HttpServiceContext } from "../../../utils/HttpManager";
import { UIUtils } from "../../../utils/UIUtils";
import { VBContext } from "../../../utils/VBContext";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { SynonymizerDetailsModalData, SynonymizerDetailsModal } from "./synonymizerDetailsModal";

export class CreateRemoteAlignmentTaskModalData extends BSModalContext {
    constructor(public leftProject: Project, public rightProject: Project) {
        super();
    }
}

@Component({
    selector: "create-alignment-task-modal",
    templateUrl: "./createRemoteAlignmentTaskModal.html",
    host: { class: "blockingDivHost" },
})
export class CreateRemoteAlignmentTaskModal implements ModalComponent<CreateRemoteAlignmentTaskModalData> {
    context: CreateRemoteAlignmentTaskModalData;

    @ViewChild('blockingDiv') public blockingDivElement: ElementRef;

    private projectList: Project[];
    private selectedRightProject: Project;

    private leftProjectStruct: AlignedProjectStruct;
    private rightProjectStruct: AlignedProjectStruct;

    private refinableTaskReport: RefinableTaskReport;
    private refinablePairings: ResolvedPairing[];

    constructor(public dialog: DialogRef<CreateRemoteAlignmentTaskModalData>, private projectService: ProjectServices,
        private mapleService: MapleServices, private remoteAlignmentService: RemoteAlignmentServices, private basicModals: BasicModalServices,
        private modal: Modal) {
        this.context = dialog.context;
    }

    ngOnInit() {
        //TODO in production, 2nd parameter should be true? the target dataset should be user dependent?
        this.projectService.listProjects(VBContext.getWorkingProject(), false, true).subscribe(
            projects => {
                this.projectList = projects;
                if (this.context.rightProject != null) {
                    this.selectedRightProject = this.projectList.find(p => p.getName() == this.context.rightProject.getName());
                    if (this.selectedRightProject != null) {
                        this.onRightProjectChange();
                    }
                }
            }
        );
        this.leftProjectStruct = new AlignedProjectStruct();
        this.leftProjectStruct.project = this.context.leftProject;
        this.initProjectStruct(this.leftProjectStruct);
    }

    //========== Datasets handlers ===========

    private onRightProjectChange() {
        this.rightProjectStruct = new AlignedProjectStruct();
        this.rightProjectStruct.project = this.selectedRightProject;
        this.initProjectStruct(this.rightProjectStruct);
    }

    private initProjectStruct(projStruct: AlignedProjectStruct) {
        HttpServiceContext.setContextProject(projStruct.project);
        this.mapleService.checkProjectMetadataAvailability().finally(
            () => HttpServiceContext.removeContextProject()
        ).subscribe(
            available => {
                projStruct.profileAvailable = available;
            }
        );
    }

    private profileProject(projStruct: AlignedProjectStruct) {
        if (projStruct.profileAvailable) {
            this.basicModals.confirm("Profile project " + projStruct.project.getName(), "The project '" + projStruct.project.getName() + 
                "' has already been profiled. Do you want to repeat and override the profilation?", "warning").then(
                confirm => {
                    this.profileProjectImpl(projStruct);
                },
                cancel => {}
            )
        } else {
            this.profileProjectImpl(projStruct);
        }
        
    }
    private profileProjectImpl(projStruct: AlignedProjectStruct) {
        UIUtils.startLoadingDiv(this.blockingDivElement.nativeElement);
        HttpServiceContext.setContextProject(projStruct.project);
        this.mapleService.profileProject().finally(
            () => HttpServiceContext.removeContextProject()
        ).subscribe(
            () => {
                UIUtils.stopLoadingDiv(this.blockingDivElement.nativeElement);
                projStruct.profileAvailable = true;
            }
        );
    }

    //========== Matching profilation handlers ===========

    private isProfileEnabled() {
        return (
            this.leftProjectStruct.profileAvailable &&
            this.rightProjectStruct != null && this.rightProjectStruct.profileAvailable
        )
    }

    private profileMatching() {
        this.mapleService.profileMatchingProblemBetweenProjects(this.leftProjectStruct.project, this.rightProjectStruct.project).subscribe(
            report => {
                /**
                 * profileMatchingProblemBetweenProjects return a RefinableTaskReport which contains a list of RefinablePairing.
                 * Each pairing has a list of synonymizers, only one of them should be chosen for the task creation.
                 * In order to support the UI, here the pairings are mapped into a list of ResolvedPairing which contains useful info.
                 */
                this.refinableTaskReport = report;
                this.refinablePairings = [];
                this.refinableTaskReport.pairings.forEach(p => {
                    let synonymizers: ResolvedSynonymizer[] = [];
                    p.synonymizers.forEach(s => {
                        let syn: ResolvedSynonymizer = {
                            score: s.score,
                            scoreRound: Math.round((s.score + Number.EPSILON) * 1000) / 1000,
                            conceptualizationSet: s.conceptualizationSet,
                            conceptualizationSetDataset: <ConceptualizationSet>this.refinableTaskReport.supportDatasets.find(d => d["@id"] == s.conceptualizationSet),
                            lexicon: s.lexicon,
                            lexiconDataset: <Lexicon>this.refinableTaskReport.supportDatasets.find(d => d["@id"] == s.lexicon),
                            language: null,
                        }
                        syn.language = Languages.getLanguageFromTag(syn.lexiconDataset.languageTag)
                        synonymizers.push(syn);
                    })
                    let rp: ResolvedPairing = {
                        score: p.score,
                        scoreRound: Math.round((p.score + Number.EPSILON) * 1000) / 1000,
                        bestCombinedScore: p.bestCombinedScore,
                        bestCombinedScoreRound: Math.round((p.bestCombinedScore + Number.EPSILON) * 1000) / 1000,
                        source: p.source,
                        sourceLexicalizationSet: <LexicalizationSet>this.refinableTaskReport.supportDatasets.find(d => d["@id"] == p.source.lexicalizationSet),
                        target: p.target,
                        targetLexicalizationSet: <LexicalizationSet>this.refinableTaskReport.supportDatasets.find(d => d["@id"] == p.target.lexicalizationSet),
                        synonymizers: synonymizers,
                        language: null,
                        checked: false,
                        selectedSynonymizer: null
                    }
                    rp.language = Languages.getLanguageFromTag(rp.sourceLexicalizationSet.languageTag)
                    this.refinablePairings.push(rp)
                });
                //initialize as selected pairing the one with the highest score
                let bestScore = Math.max(...this.refinablePairings.map(p => p.score));
                this.refinablePairings.find(p => p.score == bestScore).checked = true;
            }
        );
    }

    private selectSynonymizer(pairing: ResolvedPairing, synonymizer: ResolvedSynonymizer) {
        if (pairing.selectedSynonymizer == synonymizer) {
            pairing.selectedSynonymizer = null;
        } else {
            pairing.selectedSynonymizer = synonymizer;
        }
    }

    private describeSynonymizer(synonymizer: ResolvedSynonymizer) {
        //open a modal that show the lexicon and the conceptualization set of the synonymizer
        let modalData = new SynonymizerDetailsModalData(synonymizer);
        const builder = new BSModalContextBuilder<SynonymizerDetailsModalData>(
            modalData, undefined, SynonymizerDetailsModalData
        );
        let overlayConfig: OverlayConfig = { context: builder.keyboard(27).toJSON() };
        this.modal.open(SynonymizerDetailsModal, overlayConfig);
    }

    //================================

    private isOkEnabled() {
        return this.refinableTaskReport != null;
    }

    ok() {
        if (!this.refinablePairings.some(p => p.checked)) {
            this.basicModals.alert("Missing pairing", "You need to select at least one pairing", "warning");
            return;
        }
        /* prepare the task report to provide to createTask service */
        //first map the enabled refinable pairings into a Pairing list
        let pairings: Pairing[] = [];
        this.refinablePairings.forEach(p => {
            if (p.checked) {
                let pairing: Pairing = {
                    score: p.score,
                    source: p.source,
                    target: p.target,
                    synonymizer: null
                }
                if (p.selectedSynonymizer != null) {
                    let synonymizer: Synonymizer = {
                        score: p.selectedSynonymizer.score,
                        conceptualizationSet: p.selectedSynonymizer.conceptualizationSet,
                        lexicon: p.selectedSynonymizer.lexicon
                    }
                    pairing.synonymizer = synonymizer;
                }
                pairings.push(pairing);
            }
        });
        let taskReport: TaskReport = {
            leftDataset: this.refinableTaskReport.leftDataset,
            rightDataset: this.refinableTaskReport.rightDataset,
            supportDatasets: this.refinableTaskReport.supportDatasets,
            pairings: pairings
        }
        this.remoteAlignmentService.createTask(taskReport).subscribe(
            taskId => {
                this.dialog.close(taskId);
            }
        );
    }
    
    cancel() {
        this.dialog.dismiss();
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
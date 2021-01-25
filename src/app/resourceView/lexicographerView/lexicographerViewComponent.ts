import { Component, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild } from "@angular/core";
import { NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { Form, LexicographerView, Sense } from "src/app/models/LexicographerView";
import { OntoLex, SKOS, XmlSchema } from "src/app/models/Vocabulary";
import { LexicographerViewServices } from "src/app/services/lexicographerViewServices";
import { OntoLexLemonServices } from "src/app/services/ontoLexLemonServices";
import { ResourcesServices } from "src/app/services/resourcesServices";
import { BrowsingModalServices } from "src/app/widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "src/app/widget/modal/creationModal/creationModalServices";
import { NewOntoLexicalizationCfModalReturnData } from "src/app/widget/modal/creationModal/newResourceModal/ontolex/newOntoLexicalizationCfModal";
import { ModalOptions } from "src/app/widget/modal/Modals";
import { ARTLiteral, ARTResource, ARTURIResource } from "../../models/ARTResources";
import { ResourceViewCtx } from "../../models/ResourceView";
import { HttpServiceContext } from "../../utils/HttpManager";
import { UIUtils } from "../../utils/UIUtils";
import { ProjectContext } from "../../utils/VBContext";
import { ResViewSettingsModal } from "../resViewSettingsModal";

@Component({
    selector: "lexicographer-view",
    templateUrl: "./lexicographerViewComponent.html",
    styleUrls: ["./lexicographerViewComponent.css"],
    host: { class: "vbox" }
})
export class LexicographerViewComponent {
    @Input() resource: ARTURIResource;
    @Input() readonly: boolean = false;
    @Input() context: ResourceViewCtx;
    @Input() projectCtx: ProjectContext;
    @Output() dblclickObj: EventEmitter<ARTResource> = new EventEmitter<ARTResource>();
    @Output() update: EventEmitter<ARTResource> = new EventEmitter<ARTResource>(); //(useful to notify resourceViewTabbed that resource is updated)

    @ViewChild('blockDiv', { static: true }) blockDivElement: ElementRef;
    private viewInitialized: boolean = false; //in order to wait blockDiv to be ready

    private lemmaStyle = "font-family: serif; font-weight: bold; font-size: 2rem;"
    private formStyle = "font-family: serif; font-style: italic;";

    lemma: Form[]; //in case of validation the staging-add is at pos.0, staging-remove at 1 (TODO verify and force it when it will be supported)
    otherForms: Form[];
    senses: Sense[];

    pendingOtherForm: ARTLiteral; //written rep of an other form that is going to be added

    constructor(private lexicographerViewService: LexicographerViewServices, private ontolexService: OntoLexLemonServices, private resourceService: ResourcesServices,
        private browsingModals: BrowsingModalServices, private creationModals: CreationModalServices, private modalService: NgbModal) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['resource'] && changes['resource'].currentValue) {
            //if not the first change, avoid to refresh res view if resource is not changed
            if (!changes['resource'].firstChange) { 
                let prevRes: ARTResource = changes['resource'].previousValue;
                if (prevRes.getNominalValue() == this.resource.getNominalValue()) {
                    return;
                }
            }
            if (this.viewInitialized) {
                this.buildLexicographerView();//refresh resource view when Input resource changes
            }
        }
    }

    ngOnInit() {
        this.readonly = this.readonly || HttpServiceContext.getContextVersion() != null; //if it is working on an old dump version, disable the updates
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.buildLexicographerView();
    }

    buildLexicographerView() {
        UIUtils.startLoadingDiv(this.blockDivElement.nativeElement);
        this.lexicographerViewService.getLexicalEntryView(this.resource).subscribe(
            resp => {
                let lv = LexicographerView.parse(resp);
                this.lemma = lv.lemma;
                this.otherForms = lv.otherForms;
                this.sortForms(this.otherForms);
                this.senses = lv.senses;
                this.sortSenses(this.senses);
                //temp code just for testing purposes
                if (this.senses[0] && this.senses[0].definition.length == 0) {
                    this.senses[0].definition = [
                        new ARTLiteral("This definition has been added just for testing purposes from the Angular component since this sense has no definition. Decomment the code in order to remove it", null, "en"),
                        new ARTLiteral("This second test definition has been added like the previous from the Angular component", null, "en"),
                    ];
                }
                UIUtils.stopLoadingDiv(this.blockDivElement.nativeElement);
            }
        );
    }

    private sortForms(forms: Form[]) {
        forms.sort((f1, f2) => {
            return f1.writtenRep[0].getShow().localeCompare(f2.writtenRep[0].getShow())
        })
    }
    private sortSenses(senses: Sense[]) {
        senses.sort((s1, s2) => {
            return s1.reference[0].getShow().localeCompare(s2.reference[0].getShow())
        })
    }

    //=== Lemma ===

    onLemmaEdited(oldWrittenRep: ARTLiteral, newValue: string) {
        if (oldWrittenRep.getShow() == newValue) return;
        let newWrittenRep = new ARTLiteral(newValue, null, oldWrittenRep.getLang());
        this.ontolexService.setCanonicalForm(this.resource, newWrittenRep).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }

    addMorphosintacticPropToLemma(lemma: Form) {
        alert("TODO: add morphosintactic prop to lemma " + lemma.id.getShow());
    }

    //=== Other forms ===

    onOtherFormEdited(form: Form, oldWrittenRep: ARTLiteral, newValue: string) {
        if (oldWrittenRep.getShow() == newValue) return;
        let newWrittenRep: ARTLiteral = new ARTLiteral(newValue, null, oldWrittenRep.getLang());
        this.resourceService.updateTriple(form.id, OntoLex.writtenRep, oldWrittenRep, newWrittenRep).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }
    
    addOtherForm() {
        this.pendingOtherForm = new ARTLiteral("");
    }
    deleteOtherForm(form: Form) {
        this.ontolexService.removeForm(this.resource, OntoLex.otherForm, form.id).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }
    onPendingOtherFormConfirmed(value: string) {
        let writtenRep: ARTLiteral = new ARTLiteral(value, null, this.lemma[0].writtenRep[0].getLang());
        this.ontolexService.addOtherForm(this.resource, writtenRep).subscribe(
            () => {
                this.pendingOtherForm = null;
                this.buildLexicographerView();
            }
        )
    }
    onPendingOtherFormCanceled() {
        this.pendingOtherForm = null;
    }

    addMorphosintacticPropToForm(form: Form) {
        alert("TODO: add morphosintactic prop to form " + form.id.getShow());
    }

    //=== Senses ===

    addSense() {
        this.creationModals.newOntoLexicalizationCf({key:"DATA.ACTIONS.ADD_LEXICAL_SENSE"}, OntoLex.sense, false).then(
            (data: NewOntoLexicalizationCfModalReturnData) => {
                this.ontolexService.addLexicalization(this.resource, data.linkedResource, data.createPlain, data.createSense, data.cls, data.cfValue).subscribe(
                    () => {
                        this.buildLexicographerView();
                    }
                );
            },
            () => {}
        )
    }

    addDefinition(sense: Sense) {
        sense['pendingDef'] = {}; //add a fake object just to make appear a input field in the UI
    }
    onPendingDefConfirmed(sense: Sense, newDef: string) {
        alert("TODO add " + newDef + " to sense " + sense.id.getShow())
    }
    onPendingDefCanceled(sense: Sense) {
        delete sense['pendingDef']; //delete the fake object to makje disappear the input field from the UI
    }
    onDefinitionEdited(sense: Sense, def: ARTLiteral, newValue: string) {
        let newDefinition = new ARTLiteral(newValue, null, def.getLang())
        this.resourceService.updateTriple(sense.concept[0], SKOS.definition, def, newDefinition).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }
    deleteDefinition(sense: Sense, def: ARTLiteral) {
        this.resourceService.removeValue(sense.concept[0], SKOS.definition, def).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }
    
    setConcept(sense: Sense) {
        //TODO: this is a huge problem in a real case scenario where ontolex:LexicalConcept has too much instances
        this.browsingModals.browseInstanceList("", OntoLex.lexicalConcept).then(
            lexConc => {
                this.resourceService.addValue(sense.id, OntoLex.isLexicalizedSenseOf, lexConc).subscribe(
                    () => {
                        this.buildLexicographerView();
                    }
                )
            }
        )
    }
    deleteConcept(sense: Sense, concept: ARTURIResource) {
        this.resourceService.removeValue(sense.id, OntoLex.isLexicalizedSenseOf, concept).subscribe(
            () => {
                this.buildLexicographerView();
            }
        )
    }



    resourceDblClick(resource: ARTResource) {
        this.dblclickObj.emit(resource);
    }

    /**
     * Opens a modal that allows to edit the resource view settings
     */
    openSettings() {
        const modalRef: NgbModalRef = this.modalService.open(ResViewSettingsModal, new ModalOptions('lg'));
        return modalRef.result;
    }


}
import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core";
import { Form, LexicalEntry } from "src/app/models/LexicographerView";
import { OntoLexLemonServices } from "src/app/services/ontoLexLemonServices";
import { AuthorizationEvaluator } from "src/app/utils/AuthorizationEvaluator";
import { ResourceUtils } from "src/app/utils/ResourceUtils";
import { VBActionsEnum } from "src/app/utils/VBActions";
import { BrowsingModalServices } from "src/app/widget/modal/browsingModal/browsingModalServices";
import { ARTLiteral, ARTResource, ARTURIResource } from "../../../models/ARTResources";
import { ResourceViewCtx } from "../../../models/ResourceView";
import { ProjectContext } from "../../../utils/VBContext";
import { LexViewCache } from "../LexViewChache";

@Component({
    selector: "lex-entry",
    templateUrl: "./lexEntryComponent.html",
    host: { class: "d-block" }
})
export class LexEntryComponent {
    @Input() entry: LexicalEntry;
    @Input() lexViewCache: LexViewCache;
    @Input() readonly: boolean = false;
    @Input() context: ResourceViewCtx;
    @Input() projectCtx: ProjectContext;
    @Output() update: EventEmitter<ARTResource> = new EventEmitter<ARTResource>(); //(useful to notify resourceViewTabbed that resource is updated)

    title: ARTLiteral; //written rep of the canonical form (if in validation, the stage-add is chosen)

    pendingMorphoProp: boolean;

    //auth
    addMorphoPropAuthorized: boolean;

    constructor(private browsingModals: BrowsingModalServices, private ontolexService: OntoLexLemonServices) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['entry'] && changes['entry'].currentValue) {
            this.initTitle();
        }

        this.addMorphoPropAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.resourcesAddValue, this.entry.id) && !this.readonly;
    }

    /**
     * Get the main written rep of the lemma
     */
    private initTitle() {
        //get the canonical form
        let l: Form;
        if (this.entry.lemma.length == 1) {
            l = this.entry.lemma[0]
        } else if (this.entry.lemma.length > 1) { //probably in validation
            l = this.entry.lemma.find(lem => lem.isInStagingAdd());
            if (l == null) { //no lemma in addition => get the first one
                l = this.entry.lemma[0]
            }
        }
        if (l != null) {
            //get the written rep
            if (l.writtenRep.length == 1) {
                this.title = l.writtenRep[0];
            } else if (l.writtenRep.length > 1) { //probably in validation
                this.title = l.writtenRep.find(wr => ResourceUtils.isTripleInStagingAdd(wr));
                if (this.title == null) { //no writtenRep in addition => get the first one
                    this.title = l.writtenRep[0];
                }
            }
        }
    }

    /**
     * === MORPHOSYNTACTIC PROP ===
     */

    addMorphosintacticProp() {
        this.pendingMorphoProp = true;
    }

    onPendingMorphPropCanceled() {
        this.pendingMorphoProp = false;
    }


    addSubterm() {
        this.browsingModals.browseLexicalEntryList({key:"DATA.ACTIONS.ADD_SUBTERM"}).then(
            (entry: ARTURIResource) => {
                this.ontolexService.addSubterm(<ARTURIResource>this.entry.id, entry).subscribe(
                    () => {
                        this.update.emit();
                    }
                )
            },
            () => {}
        )
    }

    /**
     * Propagate the update request from the child component (morphosyntactic-prop and phonetic-rep)
     */
    onUpdate() {
        this.update.emit();
    }

}
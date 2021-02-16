import { Component, EventEmitter, Input, Output, SimpleChanges } from "@angular/core";
import { ARTResource, ARTURIResource } from "src/app/models/ARTResources";
import { EntryReference, LexicalEntry, LexicalRelation, LexicalResourceUtils } from "src/app/models/LexicographerView";
import { ResourcesServices } from "src/app/services/resourcesServices";
import { AuthorizationEvaluator } from "src/app/utils/AuthorizationEvaluator";
import { VBActionsEnum } from "src/app/utils/VBActions";

@Component({
    selector: "lexical-relation",
    templateUrl: "./lexicalRelationComponent.html",
    host: { class: "d-block" }
})
export class LexicalRelationComponent {
    @Input() readonly: boolean = false;
    @Input() entry: LexicalEntry;
    @Input() relation: LexicalRelation;
    @Output() dblclickObj: EventEmitter<ARTResource> = new EventEmitter<ARTResource>();
    @Output() update: EventEmitter<void> = new EventEmitter(); //something changed, request to update

    category: ARTURIResource;
    targetRef: EntryReference[];

    deleteAuthorized: boolean;

    constructor(private resourceService: ResourcesServices) { }

    ngOnChanges(change: SimpleChanges) {
        if (change['relation']) {
            this.init();
        }
    }

    init() {
        if (this.relation.source.some(e => e.id.equals(this.entry.id))) { //current entry is among the source entries
            this.targetRef = this.relation.target;
        } else { //current entry is not among the source entries => inverse relation
            this.targetRef = this.relation.source;
        }
        this.category = this.relation.category[0];

        this.readonly = LexicalResourceUtils.isInStaging(this.relation);
        this.deleteAuthorized = AuthorizationEvaluator.isAuthorized(VBActionsEnum.resourcesRemoveValue, this.entry.id) && !this.readonly;
    }

    delete() {
        //delete allowed only when not in validation, so just get the first of category and target EntryRerference
        if (this.relation.id == null) { //plain relation
            this.resourceService.removeValue(this.entry.id, this.relation.category[0], this.targetRef[0].id).subscribe(
                () => {
                    this.update.emit();
                }
            )
        } else { //reified
            //TODO how?
            alert("Removal of reified relation still not handled")
        }

    }

    targetDblClick(ref: EntryReference) {
        this.dblclickObj.emit(ref.id);
    }

    relationDblClick() {
        if (this.relation.id) { //only in case of reified relation
            this.dblclickObj.emit(this.relation.id);
        }
    }

}
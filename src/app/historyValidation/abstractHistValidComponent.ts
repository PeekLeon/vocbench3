import { Directive } from "@angular/core";
import { Subscription } from "rxjs";
import { ARTResource, ARTURIResource } from "../models/ARTResources";
import { CommitInfo, SortingDirection } from "../models/History";
import { User } from "../models/User";
import { NTriplesUtil } from "../utils/ResourceUtils";
import { VBEventHandler } from "../utils/VBEventHandler";
import { SharedModalServices } from "../widget/modal/sharedModal/sharedModalServices";
import { HistoryValidationModalServices } from "./modals/historyValidationModalServices";

/**
 * This abstract class is used to keep the attributes and mehtods that HistoryComponent and ValidationComponent have in common
 */
@Directive()
export abstract class AbstractHistValidComponent {

    eventSubscriptions: Subscription[] = [];

    //Sorting
    sortingDirectionList: SortingDirectionStruct[] = [
        { id: SortingDirection.Unordered, translationKey: "HISTORY_VALIDATION.SORT_UNORDERED" },
        { id: SortingDirection.Ascending, translationKey: "HISTORY_VALIDATION.SORT_ASCENDING" },
        { id: SortingDirection.Descending, translationKey: "HISTORY_VALIDATION.SORT_DESCENDING" }
    ];
    operationSorting: SortingDirectionStruct = this.sortingDirectionList[0]; //unordered default
    timeSorting: SortingDirectionStruct = this.sortingDirectionList[2]; //descending default

    //Filters
    showFilterBox: boolean = false;
    //operation
    operations: ARTURIResource[] = [];
    //performers
    performers: User[] = [];
    //time
    fromTime: any;
    toTime: any;

    //paging
    limit: number = 100;
    page: number = 0;
    pageCount: number;
    revisionNumber: number = 0;

    pageSelector: number[] = [];
    pageSelectorOpt: number;

    commits: CommitInfo[];

    protected sharedModals: SharedModalServices;
    protected hvModals: HistoryValidationModalServices;
    protected eventHandler: VBEventHandler;
    constructor(sharedModals: SharedModalServices, hvModals: HistoryValidationModalServices, eventHandler: VBEventHandler) {
        this.sharedModals = sharedModals;
        this.hvModals = hvModals;
        this.eventHandler = eventHandler;
        this.eventSubscriptions.push(this.eventHandler.operationUndoneEvent.subscribe((commit: CommitInfo) => this.onOperationUndone(commit)));
    }

    ngOnDestroy() {
        this.eventSubscriptions.forEach(s => s.unsubscribe());
    }

    abstract init(): void;

    abstract listCommits(): void;

    getPreviousCommits() {
        this.page--;
        this.listCommits();
    }

    getNextCommits() {
        this.page++;
        this.listCommits();
    }

    goToPage() {
        if (this.page != this.pageSelectorOpt) {
            this.page = this.pageSelectorOpt;
            this.listCommits();
        }
    }

    inspectParams(item: CommitInfo) {
        return this.hvModals.inspectParams(item);
    }

    getCommitDelta(item: CommitInfo) {
        return this.hvModals.getCommitDelta(item);
    }

    //SORT HANDLER
    sortOperation(direction: SortingDirectionStruct) {
        this.operationSorting = direction;
        this.init();
    }

    sortTime(direction: SortingDirectionStruct) {
        this.timeSorting = direction;
        this.init();
    }

    //FILTERS HANDLER

    toggleFilterBox() {
        this.showFilterBox = !this.showFilterBox;
    }

    onFilterApplied(filters: { operations: ARTURIResource[], performers: User[], fromTime: string, toTime: string }) {
        this.operations = filters.operations;
        this.performers = filters.performers;
        this.fromTime = filters.fromTime;
        this.toTime = filters.toTime;
        this.pageSelectorOpt = null;
        this.init();
    }

    getFormattedFromTime(): string {
        if (this.fromTime == null) {
            return null;
        } else {
            return new Date(this.fromTime).toISOString();
        }
    }

    getFormattedToTime(): string {
        if (this.toTime == null) {
            return null;
        } else {
            return new Date(this.toTime).toISOString();
        }
    }

    getPerformersIRI(): ARTURIResource[] {
        let performersIRI: ARTURIResource[];
        if (this.performers.length > 0) {
            performersIRI = [];
            this.performers.forEach((p: User) => {
                performersIRI.push(p.getIri());
            });
        }
        return performersIRI;
    }

    //Utility
    isLargeWidth(): boolean {
        return window.innerWidth > 1440;
    }

    showOtherParamButton(item: CommitInfo): boolean {
        if (this.isLargeWidth()) {
            return item.operationParameters.length > 3;
        } else {
            return item.operationParameters.length > 2;
        }
    }

    private openValueResourceView(value: string) {
        try {
            let res: ARTResource;
            if (value.startsWith("<") && value.endsWith(">")) { //uri
                res = NTriplesUtil.parseURI(value);
            } else if (value.startsWith("_:")) { //bnode
                res = NTriplesUtil.parseBNode(value);
            }
            if (res != null) {
                this.sharedModals.openResourceView(res, true);
            }
        } catch (err) {
            //not parseable => not a resource
        }
    }

    private onOperationUndone(commit: CommitInfo) {
        let idx = this.commits.findIndex(c => c.commit.equals(commit.commit));
        if (idx != -1) {
            this.commits.splice(idx, 1);
        }

    }

}

interface SortingDirectionStruct {
    id: SortingDirection;
    translationKey: string;
}
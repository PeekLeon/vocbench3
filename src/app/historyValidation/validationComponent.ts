import { Component } from "@angular/core";
import { Modal, BSModalContextBuilder } from 'angular2-modal/plugins/bootstrap';
import { ValidationServices } from "../services/validationServices";
import { CommitInfo } from "../models/History";
import { UIUtils } from "../utils/UIUtils";
import { AbstractHistValidComponent } from "./abstractHistValidComponent";

@Component({
    selector: "validation-component",
    templateUrl: "./validationComponent.html",
    host: { class: "pageComponent" }
})
export class ValidationComponent extends AbstractHistValidComponent {

    //paging
    private tipTime: string;

    private ACTION_ACCEPT = { value: "accept", show: "Accept" };
    private ACTION_REJECT = { value: "reject", show: "Reject" };
    private ACTION_NONE = { value: "------", show: "------" };
    private validationActions: { value: string, show: string }[] = [
        this.ACTION_NONE,
        this.ACTION_ACCEPT,
        this.ACTION_REJECT
    ];

    constructor(private validationService: ValidationServices, modal: Modal) {
        super(modal);
    }

    init() {
        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        this.commits = [];
        this.validationService.getStagedCommitSummary(this.operations, this.getFormattedFromTime(), this.getFormattedToTime(), this.limit).subscribe(
            stResp => {
                UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
                this.pageCount = stResp.pageCount;
                this.tipTime = stResp.tipTime;
                if (this.tipTime != null) {
                    this.listCommits();
                }
            }
        );
    }

    listCommits() {
        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        this.validationService.getCommits(this.tipTime, this.operations, this.getFormattedFromTime(), 
            this.operationSorting, this.timeSorting, this.page, this.limit).subscribe(
            commits => {
                this.commits = commits;
                this.commits.forEach(c => c['validationAction'] = this.ACTION_NONE);
                UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
            }
        );
    }

    private acceptAll() {
        for (var i = 0; i < this.commits.length; i++) {
            this.commits[i]['validationAction'] = this.ACTION_ACCEPT;
        }
    }

    private rejectAll() {
        for (var i = 0; i < this.commits.length; i++) {
            this.commits[i]['validationAction'] = this.ACTION_REJECT;
        }
    }

    private validate() {
        UIUtils.startLoadingDiv(UIUtils.blockDivFullScreen);
        this.validateCommitsRecursively(this.commits.slice());
    }

    /**
     * Accept or reject commits one after the other
     * @param commits 
     */
    private validateCommitsRecursively(commits: CommitInfo[]) {
        var validationFunctions: any;
        if (commits.length == 0) {
            UIUtils.stopLoadingDiv(UIUtils.blockDivFullScreen);
            this.init();
        } else {
            if (commits[0]['validationAction'] == this.ACTION_ACCEPT) {
                validationFunctions = this.validationService.accept(commits[0].commit);
            } else if (commits[0]['validationAction'] == this.ACTION_REJECT) {
                validationFunctions = this.validationService.reject(commits[0].commit);
            } else {
                commits.shift();
                this.validateCommitsRecursively(commits);
                return;
            }
            validationFunctions.subscribe(
                (stResp: any) => {
                    commits.shift();
                    this.validateCommitsRecursively(commits);
                }
            );
        }
    }

}
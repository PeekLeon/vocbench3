import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from "rxjs";
import { ModalType, Translation } from 'src/app/widget/modal/Modals';
import { AccessLevel, AccessStatus, ConsumerACL, LockLevel, Project } from '../../models/Project';
import { ProjectServices } from "../../services/projectServices";
import { UIUtils } from "../../utils/UIUtils";
import { VBContext } from "../../utils/VBContext";
import { BasicModalServices } from "../../widget/modal/basicModal/basicModalServices";

@Component({
    selector: "acl-editor-modal",
    templateUrl: "./aclEditorModal.html",
})
export class ACLEditorModal {
    @Input() project: Project;

    @ViewChild('blockingDiv', { static: true }) public blockingDivElement: ElementRef;

    consumers: ConsumerACL[];
    lock: { availableLockLevel: LockLevel, lockingConsumer: string, acquiredLockLevel: LockLevel };

    nullAccessLevel: AccessLevel = null;
    accessLevels: AccessLevel[] = [AccessLevel.R, AccessLevel.RW];
    extAccessLevel: AccessLevel = AccessLevel.EXT;
    lockLevels: LockLevel[] = [LockLevel.R, LockLevel.W, LockLevel.NO];
    universalACLLevel: AccessLevel;

    filterProject: string;

    private update: boolean = false;

    constructor(public activeModal: NgbActiveModal, private projectService: ProjectServices, private basicModals: BasicModalServices) { }

    ngOnInit() {
        this.initAccessStatus();
    }

    initAccessStatus() {
        UIUtils.startLoadingDiv(this.blockingDivElement.nativeElement);
        this.projectService.getAccessStatus(this.project).subscribe(
            (projACL: AccessStatus) => {
                UIUtils.stopLoadingDiv(this.blockingDivElement.nativeElement);
                this.consumers = projACL.consumers;
                this.lock = projACL.lock;
                this.universalACLLevel = projACL.universalACLLevel;
                //in case a universal level R or RW is set, set the same level to the specific project-consumer available level (the UI will lock the related selector)
                if (this.universalACLLevel == AccessLevel.R || this.universalACLLevel == AccessLevel.RW) {
                    this.consumers.forEach(c => {
                        if (c.name != "SYSTEM") {
                            c.availableACLLevel = this.universalACLLevel;
                        }
                    });
                }
            }
        );
    }

    onAccessLevelChange(consumer: ConsumerACL, newLevel: AccessLevel) {
        let oldLevel: AccessLevel = consumer.availableACLLevel;
        let message: Translation;
        if (newLevel == this.nullAccessLevel) {
            message = { key: "MESSAGES.ACL_REVOKE_ACCESS_CONFIRM", params: { project: this.project.getName(true), consumer: consumer.name } };
        } else {
            message = { key: "MESSAGES.ACL_CHANGE_ACCESS_CONFIRM", params: { project: this.project.getName(true), level: newLevel, consumer: consumer.name } };
        }
        this.basicModals.confirm({ key: "PROJECTS.ACTIONS.UPDATE_ACCESS_LEVEL" }, message, ModalType.warning).then(
            () => {
                let updateFn: Observable<void>;
                if (VBContext.getLoggedUser().isAdmin()) {
                    updateFn = this.projectService.updateProjectAccessLevel(this.project, new Project(consumer.name), newLevel);
                } else {
                    updateFn = this.projectService.updateAccessLevel(new Project(consumer.name), newLevel);
                }
                updateFn.subscribe(
                    () => {
                        consumer.availableACLLevel = newLevel;
                        this.update = true;
                        this.initAccessStatus();
                    }
                );
            },
            () => { //reject
                consumer.availableACLLevel = oldLevel;
            }
        );
    }

    onUniversalAccessLevelChange(newLevel: AccessLevel) {
        let oldLevel: AccessLevel = this.universalACLLevel;
        let message: Translation;
        if (newLevel == this.nullAccessLevel) {
            message = { key: "MESSAGES.ACL_REVOKE_UNIVERSAL_ACCESS_CONFIRM", params: { project: this.project.getName(true) } };
        } else {
            message = { key: "MESSAGES.ACL_CHANGE_UNIVERSAL_ACCESS_CONFIRM", params: { project: this.project.getName(true), level: newLevel } };
        }
        this.basicModals.confirm({ key: "PROJECTS.ACTIONS.UPDATE_ACCESS_LEVEL" }, message, ModalType.warning).then(
            () => { //confirmed
                let updateFn: Observable<void>;
                if (VBContext.getLoggedUser().isAdmin()) {
                    updateFn = this.projectService.updateUniversalProjectAccessLevel(this.project, newLevel);
                } else {
                    updateFn = this.projectService.updateUniversalAccessLevel(newLevel);
                }
                updateFn.subscribe(
                    () => {
                        this.update = true;
                        this.initAccessStatus();
                    }
                );
            },
            () => { //rejected
                this.universalACLLevel = oldLevel;
            }
        );
    }

    onLockLevelChange(newLevel: LockLevel) {
        let oldLevel: LockLevel = this.lock.availableLockLevel;
        this.basicModals.confirm({ key: "PROJECTS.ACTIONS.UPDATE_LOCK_LEVEL" }, { key: "MESSAGES.ACL_CHANGE_LOCK_CONFIRM", params: { level: newLevel } }, ModalType.warning).then(
            () => {
                let updateFn: Observable<void>;
                if (VBContext.getLoggedUser().isAdmin()) {
                    this.projectService.updateProjectLockLevel(this.project, newLevel);
                } else {
                    this.projectService.updateLockLevel(newLevel);
                }
                updateFn.subscribe(
                    () => {
                        this.lock.availableLockLevel = newLevel;
                        this.update = true;
                        this.initAccessStatus();
                    }
                );
            },
            () => { //reject
                this.lock.availableLockLevel = oldLevel;
            }
        );
    }

    showConsumer(consumer: ConsumerACL): boolean {
        return this.filterProject == null || consumer.name.toLocaleUpperCase().indexOf(this.filterProject.toLocaleUpperCase()) != -1;
    }

    ok() {
        this.activeModal.close(this.update);
    }

}

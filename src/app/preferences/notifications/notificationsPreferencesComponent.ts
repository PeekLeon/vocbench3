import { Component, Input } from "@angular/core";
import { RDFResourceRolesEnum, ARTResource, ARTURIResource } from "../../models/ARTResources";
import { Action, NotificationPreferences } from "../../models/Notifications";
import { NotificationStatus } from "../../models/Properties";
import { NotificationServices } from "../../services/notificationServices";
import { ResourceUtils, SortAttribute } from "../../utils/ResourceUtils";
import { VBContext } from "../../utils/VBContext";
import { VBProperties } from "../../utils/VBProperties";
import { ResourcesServices } from "../../services/resourcesServices";
import { Observable } from "rxjs";
import { map } from 'rxjs/operators';

@Component({
    selector: "notifications-pref",
    templateUrl: "./notificationsPreferencesComponent.html",
    host: { class: "vbox" }
})
export class NotificationsPreferencesComponent {

    @Input() hideModeChange: boolean = false;

    //Notification options

    private notificationOptions: NotificationPrefStruct[] = [
        { value: NotificationStatus.no_notifications, show: "PREFERENCES.NOTIFICATIONS.MODES.NO_NOTIFICATIONS", description: "PREFERENCES.NOTIFICATIONS.MODES.NO_NOTIFICATIONS_INFO" },
        { value: NotificationStatus.in_app_only, show: "PREFERENCES.NOTIFICATIONS.MODES.IN_APP", description: "PREFERENCES.NOTIFICATIONS.MODES.IN_APP_INFO" },
        { value: NotificationStatus.email_instant, show: "PREFERENCES.NOTIFICATIONS.MODES.EMAIL_INSTANT", description: "PREFERENCES.NOTIFICATIONS.MODES.EMAIL_INSTANT_INFO" },
        { value: NotificationStatus.email_daily_digest, show: "PREFERENCES.NOTIFICATIONS.MODES.EMAIL_DAILY", description: "PREFERENCES.NOTIFICATIONS.MODES.EMAIL_DAILY_INFO" },
    ];
    private activeNotificationOpt: NotificationPrefStruct;

    //Notifications matrix

    actions: Action[] = [Action.creation, Action.deletion, Action.update];
    roleStructs: RoleStruct[];

    private notificationTable: NotificationTable;

    private preferences: NotificationPreferences;

    //Watching resources
    watchingResources: ARTResource[] = [];

    constructor(private notificationsService: NotificationServices, private resourceService: ResourcesServices, private vbProp: VBProperties) { }

    ngOnInit() {
        //init active notification option
        this.activeNotificationOpt = this.notificationOptions.find(o => o.value == VBContext.getWorkingProjectCtx().getProjectPreferences().notificationStatus);

        //init notifications matrix and list of watching resources
        //in order to prevent error due to lock problem, initializes these two sequentially
        this.initNotificationMatrix().subscribe(
            () => {
                this.initWatchingResources().subscribe();
            }
        )
    }

    private initNotificationMatrix(): Observable<void> {
        return this.notificationsService.getNotificationPreferences().pipe(
            map(prefs => {
                this.preferences = prefs;
                this.roleStructs = Object.keys(this.preferences)
                    .map(r => {
                        let role: RDFResourceRolesEnum = <RDFResourceRolesEnum>r;
                        return { role: role, show: ResourceUtils.getResourceRoleLabel(role) }
                    })
                    .sort((rs1, rs2) => rs1.show.localeCompare(rs2.show));
                //prepare the table struct based on the response
                this.notificationTable = {};
                this.roleStructs.forEach(
                    rs => {
                        this.notificationTable[rs.role] = {
                            creation: this.preferences[rs.role].indexOf(Action.creation) != -1,
                            deletion: this.preferences[rs.role].indexOf(Action.deletion) != -1,
                            update: this.preferences[rs.role].indexOf(Action.update) != -1,
                        }
                    }
                );
            })
        );
    }

    private initWatchingResources(): Observable<void> {
        return this.notificationsService.listWatching().pipe(
            map(watchingResources => {
                let resources: ARTURIResource[] = [];
                watchingResources.forEach(r => {
                    let res = ResourceUtils.parseNode(r);
                    if (res instanceof ARTURIResource) {
                        resources.push(res);
                    }
                })
                if (resources.length > 0) {
                    this.resourceService.getResourcesInfo(resources).subscribe(
                        annotatedRes => {
                            this.watchingResources = annotatedRes;
                            ResourceUtils.sortResources(this.watchingResources, SortAttribute.show);
                        }
                    );
                }
            })
        );
    }

    //============ Notification option handler ============

    changeNotificationStatus() {
        this.vbProp.setNotificationStatus(this.activeNotificationOpt.value);
    }

    //============ Notification matrix handler ============

    checkAllActions(status: boolean) {
        for (let role in this.notificationTable) {
            this.notificationTable[role].creation = status;
            this.notificationTable[role].deletion = status;
            this.notificationTable[role].update = status;
        }
        this.updateAllNotifications();
    }

    checkAllActionsForRole(role: RDFResourceRolesEnum, status: boolean) {
        this.notificationTable[role].creation = status;
        this.notificationTable[role].deletion = status;
        this.notificationTable[role].update = status;
        this.updateAllNotifications();
    }

    private updateAllNotifications() {
        let pref: NotificationPreferences = {};
        for (let role in this.notificationTable) {
            let activeAction: Action[] = []
            if (this.notificationTable[role].creation) {
                activeAction.push(Action.creation)
            }
            if (this.notificationTable[role].deletion) {
                activeAction.push(Action.deletion)
            }
            if (this.notificationTable[role].update) {
                activeAction.push(Action.update)
            }
            pref[role] = activeAction;
        }
        this.notificationsService.storeNotificationPreferences(pref).subscribe()
    }

    private updateNotificationPref(role: RDFResourceRolesEnum, action: Action) {
        this.notificationsService.updateNotificationPreferences(role, action, this.notificationTable[role][action]).subscribe();
    }

    //============ Watching resources handler ============

    private stopWatching(resource: ARTResource) {
        this.notificationsService.stopWatching(resource).subscribe(
            () => {
                this.watchingResources.splice(this.watchingResources.indexOf(resource), 1);
            }
        )
    }

}

interface NotificationTable { [key: string]: ActionsNotificationStruct } 
interface ActionsNotificationStruct {
    creation: boolean;
    deletion: boolean;
    update: boolean;
}

interface RoleStruct {
    role: RDFResourceRolesEnum;
    show: string;
}

interface NotificationPrefStruct {
    value: NotificationStatus;
    show: string;
    description: string;
}
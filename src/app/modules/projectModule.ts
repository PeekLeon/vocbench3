import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CreateProjectComponent } from "../project/createProject/createProjectComponent";
import { OpenAllProjReportModal } from '../project/openAllProjReportModal';
import { ACLEditorModal } from "../project/projectACL/aclEditorModal";
import { ProjectACLModal } from '../project/projectACL/projectACLModal';
import { ProjectComponent } from "../project/projectComponent";
import { ProjectListModal } from "../project/projectListModal";
import { ProjectPropertiesModal } from "../project/projectPropertiesModal";
import { ProjSettingsEditorModal } from '../project/projectSettingsEditor/projectSettingsEditorModal';
import { ProjectTableConfigModal } from "../project/projectTableConfig/projectTableConfigModal";
import { DeleteRemoteRepoModal } from '../project/remoteRepositories/deleteRemoteRepoModal';
import { DeleteRepositoryReportModal } from '../project/remoteRepositories/deleteRepositoryReportModal';
import { RemoteRepoEditorModal } from "../project/remoteRepositories/remoteRepoEditorModal";
import { SharedModule } from './sharedModule';

@NgModule({
    imports: [
        CommonModule,
        DragDropModule,
        FormsModule,
        NgbDropdownModule,
        NgbPopoverModule,
        SharedModule,
        TranslateModule
    ],
    declarations: [
        CreateProjectComponent,
        ProjectComponent,
        //modals
        ACLEditorModal, 
        DeleteRemoteRepoModal,
        DeleteRepositoryReportModal,
        OpenAllProjReportModal,
        ProjectACLModal,
        ProjectListModal, 
        ProjectPropertiesModal, 
        ProjSettingsEditorModal,
        ProjectTableConfigModal,
        RemoteRepoEditorModal,
    ],
    exports: [ProjectComponent],
    providers: [],
    entryComponents: [
        ACLEditorModal, 
        DeleteRemoteRepoModal,
        DeleteRepositoryReportModal,
        OpenAllProjReportModal,
        ProjectACLModal,
        ProjectListModal, 
        ProjectPropertiesModal, 
        ProjSettingsEditorModal,
        ProjectTableConfigModal,
        RemoteRepoEditorModal,
    ]
})
export class ProjectModule { }
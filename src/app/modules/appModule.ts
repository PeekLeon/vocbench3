import {NgModule} from '@angular/core';

import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {RouterModule} from "@angular/router";

import {STServicesModule} from "./stServicesModule";
import {SharedModule} from "./sharedModule";
import {VBModalModule} from "./vbModalModule";
import {TreeAndListModule} from "./treeAndListModule";
import {ResourceViewModule} from "./resourceViewModule";
import {ICVModule} from "./icvModule";

import {ModalModule} from 'angular2-modal';
import {BootstrapModalModule} from 'angular2-modal/plugins/bootstrap';

import {AuthServices} from "../services/authServices";

import {AppComponent} from "../appComponent";
import {appRouting} from '../appRoutes';

import {HttpManager} from "../utils/HttpManager";
import {VocbenchCtx} from "../utils/VocbenchCtx";
import {VBEventHandler} from "../utils/VBEventHandler";
import {GUARD_PROVIDERS} from "../utils/CanActivateGuards";

//Components
import {HomeComponent} from "../homeComponent";
import {ProjectComponent} from "../project/projectComponent";
import {ConceptsComponent} from "../skos/concept/conceptsComponent";
import {ClassComponent} from "../owl/classComponent";
import {PropertyComponent} from "../property/propertyComponent";
import {SchemesComponent} from "../skos/scheme/schemesComponent";
import {CollectionsComponent} from "../skos/collection/collectionsComponent";
import {SparqlComponent} from "../sparql/sparqlComponent";
import {AlignmentValidationComponent} from "../alignment/alignmentValidation/alignmentValidationComponent";
import {CustomRangeComponent} from "../customRanges/customRangeComponent";
import {ImportProjectComponent} from "../project/importProject/importProjectComponent";
import {CreateProjectComponent} from "../project/createProject/createProjectComponent";
import {IcvComponent} from "../icv/icvComponent";
import {ImportDataComponent} from "../config/dataManagement/importData/importDataComponent";
import {ExportDataComponent} from "../config/dataManagement/exportData/exportDataComponent";
import {MetadataManagementComponent} from "../config/dataManagement/metadata/metadataManagementComponent";
import {VocbenchSettingsComponent} from "../settings/vocbenchSettingsComponent";
import {RegistrationComponent} from "../user/registrationComponent";
import {TestComponent} from "../test/testComponent";

import {ConfigBarComponent} from "../config/configBar/configBarComponent";
import {LoginComponent} from "../user/loginComponent";
import {UserMenuComponent} from "../user/userMenuComponent";

@NgModule({
      imports: [
            BrowserModule, RouterModule, 
            FormsModule, //check if this is still necessary when declarated component are reduced in favor of more imported modules

            SharedModule, VBModalModule, TreeAndListModule, ResourceViewModule,

            ICVModule,

            STServicesModule,
            appRouting,
            ModalModule.forRoot(), BootstrapModalModule //Modules of angular2-modal
      ],
      //services with application scope
      providers: [
            AuthServices, //when authorization web services will be implemented, this provider should be moved in stServicesModule
            HttpManager, VocbenchCtx, VBEventHandler, GUARD_PROVIDERS
      ],
      declarations: [
            AppComponent,
            
            HomeComponent,
            ProjectComponent,
            ImportProjectComponent,
            CreateProjectComponent,
            ConceptsComponent,
            ClassComponent,
            PropertyComponent,
            SchemesComponent,
            CollectionsComponent,
            SparqlComponent,
            IcvComponent,
            AlignmentValidationComponent,
            CustomRangeComponent,
            ImportDataComponent,
            ExportDataComponent,
            MetadataManagementComponent,
            VocbenchSettingsComponent,
            RegistrationComponent,
            TestComponent, //remove???

            ConfigBarComponent,
            LoginComponent,
            UserMenuComponent
      ],
      bootstrap: [AppComponent],
})
export class AppModule { }

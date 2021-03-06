import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguagePreferencesComponent } from "../preferences/languagePreferencesComponent";
import { LanguageEditingComponent } from "../preferences/languages/languageEditingComponent";
import { LanguageRenderingComponent } from "../preferences/languages/languageRenderingComponent";
import { LanguageValueFilterComponent } from "../preferences/languages/languageValueFilterComponent";
import { NotificationsPreferencesComponent } from '../preferences/notifications/notificationsPreferencesComponent';
import { ResourceViewPreferencesComponent } from '../preferences/resourceViewPreferencesComponent';
import { VocbenchPreferencesComponent } from "../preferences/vocbenchPreferencesComponent";
import { SharedModule } from './sharedModule';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        TranslateModule
    ],
    declarations: [
        LanguageEditingComponent,
        LanguagePreferencesComponent,
        LanguageRenderingComponent,
        LanguageValueFilterComponent,
        NotificationsPreferencesComponent,
        ResourceViewPreferencesComponent,
        VocbenchPreferencesComponent,
    ],
    exports: [
        LanguageValueFilterComponent,
        ResourceViewPreferencesComponent,
        NotificationsPreferencesComponent,
        VocbenchPreferencesComponent,
    ],
    providers: [],
})
export class PreferencesModule { }
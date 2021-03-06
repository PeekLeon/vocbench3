import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CustomViewsComponent } from '../customViews/customViewsComponent';
import { CustomViewEditorModal } from '../customViews/editors/customViewEditorModal';
import { CvAssociationEditorModal } from '../customViews/editors/cvAssociationEditorModal';
import { ImportCustomViewModal } from '../customViews/editors/importCustomViewModal';
import { AdvSingleValueViewEditorComponent } from '../customViews/editors/views/advSingleValueViewEditorComponent';
import { AreaViewEditorComponent } from '../customViews/editors/views/areaViewEditorComponent';
import { DynamicVectorViewEditorComponent } from '../customViews/editors/views/dynamicVectorViewEditorComponent';
import { PointViewEditorComponent } from '../customViews/editors/views/pointViewEditorComponent';
import { PropertyChainViewEditorComponent } from '../customViews/editors/views/propertyChainViewEditorComponent';
import { RouteViewEditorComponent } from '../customViews/editors/views/routeViewEditorComponent';
import { SeriesCollectionViewEditorComponent } from '../customViews/editors/views/seriesCollectionViewEditorComponent';
import { SeriesViewEditorComponent } from '../customViews/editors/views/seriesViewEditorComponent';
import { SingleValueEditor } from '../customViews/editors/views/singleValueEditor';
import { StaticVectorViewEditorComponent } from '../customViews/editors/views/staticVectorViewEditorComponent';
import { SuggestFromCfValueSelectionModal } from '../customViews/editors/views/suggestFromCfValueSelectionModal';
import { SharedModule } from './sharedModule';

@NgModule({
    imports: [
        CommonModule,
        DragDropModule,
        FormsModule,
        NgbDropdownModule,
        SharedModule,
        TranslateModule
    ],
    providers: [],
    declarations: [
        CustomViewsComponent,
        CustomViewEditorModal,
        CvAssociationEditorModal,
        AdvSingleValueViewEditorComponent,
        AreaViewEditorComponent,
        DynamicVectorViewEditorComponent,
        ImportCustomViewModal,
        PointViewEditorComponent,
        PropertyChainViewEditorComponent,
        RouteViewEditorComponent,
        SeriesViewEditorComponent,
        SeriesCollectionViewEditorComponent,
        StaticVectorViewEditorComponent,
        SingleValueEditor,
        SuggestFromCfValueSelectionModal
    ],
    exports: [CustomViewsComponent],
    entryComponents: [
        CustomViewEditorModal,
        CvAssociationEditorModal,
        ImportCustomViewModal,
        SuggestFromCfValueSelectionModal
    ]
})
export class CustomViewsModule { }
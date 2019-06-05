import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { ARTResource, ARTURIResource, RDFResourceRolesEnum } from '../models/ARTResources';
import { Language, Languages } from '../models/LanguagesCountries';
import { ExtensionPointID } from '../models/Plugins';
import { ProjectTableColumnStruct } from '../models/Project';
import { ClassIndividualPanelSearchMode, ClassTreePreference, ConceptTreePreference, ConceptTreeVisualizationMode, LexEntryVisualizationMode, LexicalEntryListPreference, ProjectPreferences, ProjectSettings, Properties, ResourceViewMode, ResViewPartitionFilterPreference, SearchMode, SearchSettings, ValueFilterLanguages } from '../models/Properties';
import { ResViewPartition } from '../models/ResourceView';
import { OWL, RDFS } from '../models/Vocabulary';
import { PreferencesSettingsServices } from '../services/preferencesSettingsServices';
import { Cookie } from '../utils/Cookie';
import { UIUtils } from '../utils/UIUtils';
import { VBEventHandler } from '../utils/VBEventHandler';
import { BasicModalServices } from '../widget/modal/basicModal/basicModalServices';
import { VBContext } from './VBContext';

@Injectable()
export class VBProperties {

    private eventSubscriptions: Subscription[] = [];

    constructor(private prefService: PreferencesSettingsServices, private basicModals: BasicModalServices, private eventHandler: VBEventHandler) {
        this.eventSubscriptions.push(eventHandler.resourceRenamedEvent.subscribe(
            (data: { oldResource: ARTResource, newResource: ARTResource }) => this.onResourceRenamed(data.oldResource, data.newResource)
        ));
    }

    ngOnDestroy() {
        this.eventHandler.unsubscribeAll(this.eventSubscriptions);
    }

    /* =============================
    ========= PREFERENCES ==========
    ============================= */

    /**
     * To call each time the user change project
     */
    initUserProjectPreferences() {
        var properties: string[] = [
            Properties.pref_active_schemes, Properties.pref_active_lexicon, Properties.pref_show_flags,
            Properties.pref_show_instances_number, Properties.pref_project_theme,
            Properties.pref_search_languages, Properties.pref_search_restrict_lang, 
            Properties.pref_search_include_locales, Properties.pref_search_use_autocomplete, 
            Properties.pref_class_tree_filter_enabled, Properties.pref_class_tree_filter_map, Properties.pref_class_tree_root,
            Properties.pref_concept_tree_base_broader_prop, Properties.pref_concept_tree_broader_props, Properties.pref_concept_tree_narrower_props,
            Properties.pref_concept_tree_include_subprops, Properties.pref_concept_tree_sync_inverse, Properties.pref_concept_tree_visualization,
            Properties.pref_lex_entry_list_visualization, Properties.pref_lex_entry_list_index_lenght,
            Properties.pref_editing_language, Properties.pref_filter_value_languages,
            Properties.pref_res_view_partition_filter, Properties.pref_hide_literal_graph_nodes
        ];
        this.prefService.getPUSettings(properties).subscribe(
            prefs => {
                let projectPreferences: ProjectPreferences = VBContext.getWorkingProjectCtx().getProjectPreferences();

                let activeSchemes: ARTURIResource[] = [];
                let activeSchemesPref: string = prefs[Properties.pref_active_schemes];
                if (activeSchemesPref != null) {
                    let skSplitted: string[] = activeSchemesPref.split(",");
                    for (var i = 0; i < skSplitted.length; i++) {
                        activeSchemes.push(new ARTURIResource(skSplitted[i], null, RDFResourceRolesEnum.conceptScheme));
                    }
                }
                projectPreferences.activeSchemes = activeSchemes;

                let activeLexicon: ARTURIResource;
                let activeLexiconPref: string = prefs[Properties.pref_active_lexicon];
                if (activeLexiconPref != null) {
                    activeLexicon = new ARTURIResource(activeLexiconPref, null, RDFResourceRolesEnum.limeLexicon);
                }
                projectPreferences.activeLexicon = activeLexicon;

                projectPreferences.showFlags = prefs[Properties.pref_show_flags] == "true"

                let showInstPref: string = prefs[Properties.pref_show_instances_number];
                if (showInstPref != null) {
                    projectPreferences.showInstancesNumber = showInstPref == "true";
                } else { //if not specified, true for RDFS and OWL projects, false otherwise
                    let modelType: string = VBContext.getWorkingProject().getModelType();
                    projectPreferences.showInstancesNumber = modelType == RDFS.uri || modelType == OWL.uri;
                }

                let projectThemeId = prefs[Properties.pref_project_theme];
                projectPreferences.projectThemeId = projectThemeId;
                UIUtils.changeNavbarTheme(projectThemeId);

                //languages 
                projectPreferences.editingLanguage = prefs[Properties.pref_editing_language];

                let filterValueLangPref = prefs[Properties.pref_filter_value_languages];
                if (filterValueLangPref == null) {
                    projectPreferences.filterValueLang = { languages: [], enabled: false }; //default
                } else {
                    projectPreferences.filterValueLang = JSON.parse(filterValueLangPref);
                }

                //graph preferences
                let rvPartitionFilterPref = prefs[Properties.pref_res_view_partition_filter];
                if (rvPartitionFilterPref != null) {
                    projectPreferences.resViewPartitionFilter = JSON.parse(rvPartitionFilterPref);
                } else {
                    let resViewPartitionFilter: ResViewPartitionFilterPreference = {};
                    for (let role in RDFResourceRolesEnum) {
                        resViewPartitionFilter[role] = [ResViewPartition.lexicalizations];
                    }
                    projectPreferences.resViewPartitionFilter = resViewPartitionFilter;
                }

                projectPreferences.hideLiteralGraphNodes = prefs[Properties.pref_hide_literal_graph_nodes] != "false";


                //cls tree preferences
                let classTreePreferences: ClassTreePreference = { 
                    rootClassUri: (VBContext.getWorkingProject().getModelType() == RDFS.uri) ? RDFS.resource.getURI() : OWL.thing.getURI(),
                    filterMap: {}, 
                    filterEnabled: true 
                };
                let classTreeFilterMapPref: any = JSON.parse(prefs[Properties.pref_class_tree_filter_map]);
                if (classTreeFilterMapPref != null) {
                    classTreePreferences.filterMap = classTreeFilterMapPref;
                }
                classTreePreferences.filterEnabled = prefs[Properties.pref_class_tree_filter_enabled] != "false";
                let classTreeRootPref: string = prefs[Properties.pref_class_tree_root];
                if (classTreeRootPref != null) {
                    classTreePreferences.rootClassUri = classTreeRootPref;
                }
                projectPreferences.classTreePreferences = classTreePreferences;


                //concept tree preferences
                let conceptTreePreferences: ConceptTreePreference = new ConceptTreePreference();
                let conceptTreeBaseBroaderPropPref: string = prefs[Properties.pref_concept_tree_base_broader_prop];
                if (conceptTreeBaseBroaderPropPref != null) {
                    conceptTreePreferences.baseBroaderUri = conceptTreeBaseBroaderPropPref;
                }
                let conceptTreeBroaderPropsPref: string = prefs[Properties.pref_concept_tree_broader_props];
                if (conceptTreeBroaderPropsPref != null) {
                    conceptTreePreferences.broaderProps = conceptTreeBroaderPropsPref.split(",");
                }
                let conceptTreeNarrowerPropsPref: string = prefs[Properties.pref_concept_tree_narrower_props];
                if (conceptTreeNarrowerPropsPref != null) {
                    conceptTreePreferences.narrowerProps = conceptTreeNarrowerPropsPref.split(",");
                }
                let conceptTreeVisualizationPref: string = prefs[Properties.pref_concept_tree_visualization];
                if (conceptTreeVisualizationPref != null && conceptTreeVisualizationPref == ConceptTreeVisualizationMode.searchBased) {
                    conceptTreePreferences.visualization = conceptTreeVisualizationPref;
                }
                conceptTreePreferences.includeSubProps = prefs[Properties.pref_concept_tree_include_subprops] != "false";
                conceptTreePreferences.syncInverse = prefs[Properties.pref_concept_tree_sync_inverse] != "false";

                projectPreferences.conceptTreePreferences = conceptTreePreferences;


                //lexical entry list preferences
                let lexEntryListPreferences: LexicalEntryListPreference = new LexicalEntryListPreference();
                let lexEntryListVisualizationPref: string = prefs[Properties.pref_lex_entry_list_visualization];
                if (lexEntryListVisualizationPref != null && lexEntryListVisualizationPref == LexEntryVisualizationMode.searchBased) {
                    lexEntryListPreferences.visualization = lexEntryListVisualizationPref;
                }
                let lexEntryListIndexLenghtPref: string = prefs[Properties.pref_lex_entry_list_index_lenght];
                if (lexEntryListIndexLenghtPref == "2") {
                    lexEntryListPreferences.indexLength = 2;
                }
                projectPreferences.lexEntryListPreferences = lexEntryListPreferences;

                //search settings
                let searchSettings: SearchSettings = new SearchSettings();
                let searchLangsPref = prefs[Properties.pref_search_languages];
                if (searchLangsPref == null) {
                    searchSettings.languages = [];
                } else {
                    searchSettings.languages = JSON.parse(searchLangsPref);
                }
                searchSettings.restrictLang = prefs[Properties.pref_search_restrict_lang] == "true";
                searchSettings.includeLocales = prefs[Properties.pref_search_include_locales] == "true";
                searchSettings.useAutocompletion = prefs[Properties.pref_search_use_autocomplete] == "true";

                projectPreferences.searchSettings = searchSettings;


                this.initSearchSettingsCookie(); //other settings stored in cookies
            }
        );

        // this is called separately since requires the pluginId parameter
        this.prefService.getPUSettings([Properties.pref_languages], ExtensionPointID.RENDERING_ENGINE_ID).subscribe(
            prefs => {
                VBContext.getWorkingProjectCtx().getProjectPreferences().projectLanguagesPreference = prefs[Properties.pref_languages].split(",");
            }
        );
    }

    setActiveSchemes(schemes: ARTURIResource[]) {
        if (schemes == null) {
            VBContext.getWorkingProjectCtx().getProjectPreferences().activeSchemes = [];
        } else {
            VBContext.getWorkingProjectCtx().getProjectPreferences().activeSchemes = schemes;
        }
        this.eventHandler.schemeChangedEvent.emit(schemes);
        this.prefService.setActiveSchemes(schemes).subscribe();
    }

    setActiveLexicon(lexicon: ARTURIResource) {
        VBContext.getWorkingProjectCtx().getProjectPreferences().activeLexicon = lexicon;
        this.eventHandler.lexiconChangedEvent.emit(lexicon);
        this.prefService.setPUSetting(Properties.pref_active_lexicon, lexicon.getURI()).subscribe();
    }

    getShowFlags(): boolean {
        if (VBContext.getWorkingProjectCtx() != null) {
            return VBContext.getWorkingProjectCtx().getProjectPreferences().showFlags;
        } else {
            return VBContext.getSystemSettings().showFlags;
        }
    }
    setShowFlags(show: boolean) {
        VBContext.getWorkingProjectCtx().getProjectPreferences().showFlags = show;
        this.eventHandler.showFlagChangedEvent.emit(show);
        this.prefService.setShowFlags(show).subscribe();
    }

    setShowInstancesNumber(show: boolean) {
        VBContext.getWorkingProjectCtx().getProjectPreferences().showInstancesNumber = show;
        this.prefService.setShowInstancesNumb(show).subscribe();
    }

    setProjectTheme(theme: number) {
        VBContext.getWorkingProjectCtx().getProjectPreferences().projectThemeId = theme;
        UIUtils.changeNavbarTheme(theme);
        this.prefService.setProjectTheme(theme).subscribe();
    }

    setLanguagesPreference(languages: string[]) {
        this.prefService.setLanguages(languages).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().projectLanguagesPreference = languages;
    }

    setEditingLanguage(lang: string) {
        this.prefService.setPUSetting(Properties.pref_editing_language, lang).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().editingLanguage = lang;
    }

    setValueFilterLanguages(filter: ValueFilterLanguages) {
        this.prefService.setPUSetting(Properties.pref_filter_value_languages, JSON.stringify(filter)).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().filterValueLang = filter;
    }

    //class tree settings
    setClassTreeFilterMap(filterMap: { [key: string]: string[] }) {
        this.prefService.setPUSetting(Properties.pref_class_tree_filter_map, JSON.stringify(filterMap)).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().classTreePreferences.filterMap = filterMap;
    }
    setClassTreeFilterEnabled(enabled: boolean) {
        this.prefService.setPUSetting(Properties.pref_class_tree_filter_enabled, enabled+"").subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().classTreePreferences.filterEnabled = enabled;
    }
    setClassTreeRoot(rootUri: string) {
        this.prefService.setPUSetting(Properties.pref_class_tree_root, rootUri).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().classTreePreferences.rootClassUri = rootUri;
    }

    //concept tree settings
    setConceptTreeBaseBroaderProp(propUri: string) {
        this.prefService.setPUSetting(Properties.pref_concept_tree_base_broader_prop, propUri).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.baseBroaderUri = propUri;
    }
    setConceptTreeBroaderProps(props: string[]) {
        let prefValue: string;
        if (props.length > 0) {
            prefValue = props.join(",")
        }
        this.prefService.setPUSetting(Properties.pref_concept_tree_broader_props, prefValue).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.broaderProps = props;
    }
    setConceptTreeNarrowerProps(props: string[]) {
        let prefValue: string;
        if (props.length > 0) {
            prefValue = props.join(",")
        }
        this.prefService.setPUSetting(Properties.pref_concept_tree_narrower_props, prefValue).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.narrowerProps = props;
    }
    setConceptTreeIncludeSubProps(include: boolean) {
        this.prefService.setPUSetting(Properties.pref_concept_tree_include_subprops, include+"").subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.includeSubProps = include;
    }
    setConceptTreeSyncInverse(sync: boolean) {
        this.prefService.setPUSetting(Properties.pref_concept_tree_sync_inverse, sync+"").subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.syncInverse = sync;
    }
    setConceptTreeVisualization(mode: ConceptTreeVisualizationMode) {
        this.prefService.setPUSetting(Properties.pref_concept_tree_visualization, mode).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().conceptTreePreferences.visualization = mode;
    }

    //lex entry list settings
    setLexicalEntryListVisualization(mode: LexEntryVisualizationMode) {
        this.prefService.setPUSetting(Properties.pref_lex_entry_list_visualization, mode).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().lexEntryListPreferences.visualization = mode;
    }
    setLexicalEntryListIndexLenght(lenght: number) {
        this.prefService.setPUSetting(Properties.pref_lex_entry_list_index_lenght, lenght+"").subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().lexEntryListPreferences.indexLength = lenght;
    }

    //Graph settings
    setResourceViewPartitionFilter(pref: ResViewPartitionFilterPreference) {
        this.prefService.setPUSetting(Properties.pref_res_view_partition_filter, JSON.stringify(pref)).subscribe();
        VBContext.getWorkingProjectCtx().getProjectPreferences().resViewPartitionFilter = pref;
    }
    setHideLiteralGraphNodes(show: boolean) {
        VBContext.getWorkingProjectCtx().getProjectPreferences().hideLiteralGraphNodes = show;
        this.prefService.setPUSetting(Properties.pref_hide_literal_graph_nodes, show+"").subscribe();
    }


    /* =============================
    =========== SETTINGS ===========
    ============================= */

    initStartupSystemSettings() {
        this.prefService.getStartupSystemSettings().subscribe(
            stResp => {
                //experimental_features_enabled
                VBContext.getSystemSettings().experimentalFeaturesEnabled = stResp[Properties.setting_experimental_features_enabled]
                //privacy_statement_available
                VBContext.getSystemSettings().privacyStatementAvailable = stResp[Properties.privacy_statement_available]
                //show_flags
                VBContext.getSystemSettings().showFlags = stResp[Properties.pref_show_flags];
                //languages
                try {
                    var systemLanguages = <Language[]>JSON.parse(stResp[Properties.setting_languages]);
                    Languages.sortLanguages(systemLanguages);
                    Languages.setSystemLanguages(systemLanguages);
                } catch (err) {
                    this.basicModals.alert("Error", "Initialization of system languages has encountered a problem during parsing the " +
                        "'languages' property. Please, report this to the system administrator.", "error");
                }
            }
        )
    }

    setExperimentalFeaturesEnabled(enabled: boolean) {
        this.prefService.setSystemSetting(Properties.setting_experimental_features_enabled, enabled+"").subscribe();
        VBContext.getSystemSettings().experimentalFeaturesEnabled = enabled;
    }

    getExperimentalFeaturesEnabled(): boolean {
        return VBContext.getSystemSettings().experimentalFeaturesEnabled;
    }

    isPrivacyStatementAvailable(): boolean {
        return VBContext.getSystemSettings().privacyStatementAvailable;
    }

    initProjectSettings() {
        var properties: string[] = [Properties.setting_languages];
        this.prefService.getProjectSettings(properties).subscribe(
            settings => {
                let projectSettings: ProjectSettings = VBContext.getWorkingProjectCtx().getProjectSettings();
                var langsValue: string = settings[Properties.setting_languages];
                try {
                    projectSettings.projectLanguagesSetting = <Language[]>JSON.parse(langsValue);
                    Languages.sortLanguages(projectSettings.projectLanguagesSetting);
                } catch (err) {
                    this.basicModals.alert("Error", "Project setting initialization has encountered a problem during parsing " +
                        "languages settings. Default languages will be set for this project.", "error");
                    projectSettings.projectLanguagesSetting = [
                        { name: "German" , tag: "de" }, { name: "English" , tag: "en" }, { name: "Spanish" , tag: "es" },
                        { name: "French" , tag: "fr" }, { name: "Italian" , tag: "it" }
                    ];
                }
            }
        );
    }

    
    /* =============================
    ==== PREFERENCES IN COOKIES ====
    ============================= */

    /**
     * Sets the preference to show or hide the inferred information in resource view
     */
    setInferenceInResourceView(showInferred: boolean) {
        Cookie.setCookie(Cookie.RES_VIEW_INCLUDE_INFERENCE, showInferred + "", 365*10);
    }
    /**
     * Gets the preference to show or hide the inferred information in resource view
     */
    getInferenceInResourceView(): boolean {
        return Cookie.getCookie(Cookie.RES_VIEW_INCLUDE_INFERENCE) == "true";
    }

    /**
     * Sets the preference to show the URI or the rendering of resources in resource view
     */
    setRenderingInResourceView(rendering: boolean) {
        Cookie.setCookie(Cookie.RES_VIEW_RENDERING, rendering + "", 365*10);
    }
    /**
     * Gets the preference to show the URI or the rendering of resources in resource view
     */
    getRenderingInResourceView(): boolean {
        let cookieValue: string = Cookie.getCookie(Cookie.RES_VIEW_RENDERING);
        return (cookieValue == null || cookieValue == "true"); //default true, so true if cookie is not defined
    }

    /**
     * Sets the preference about the resource view mode
     */
    setResourceViewMode(mode: ResourceViewMode) {
        Cookie.setCookie(Cookie.RES_VIEW_MODE, mode, 365*10);
    }
    /**
     * Gets the preference about the resource view mode
     */
    getResourceViewMode(): ResourceViewMode {
        let mode: ResourceViewMode = <ResourceViewMode>Cookie.getCookie(Cookie.RES_VIEW_MODE);
        if (mode != ResourceViewMode.splitted && mode != ResourceViewMode.tabbed) {
            mode = ResourceViewMode.tabbed;
            this.setResourceViewMode(mode);
        }
        return mode;
    }
    /**
     * Sets the preference to keep in sync the tree/list with the resource in the tab
     * @param sync
     */
    setResourceViewTabSync(sync: boolean) {
        Cookie.setCookie(Cookie.RES_VIEW_TAB_SYNCED, sync + "", 365*10);
    }
    /**
     * Gets the preference to keep in sync the tree/list with the resource in the tab
     */
    getResourceViewTabSync(): boolean {
        let cookieValue: string = Cookie.getCookie(Cookie.RES_VIEW_TAB_SYNCED);
        return cookieValue == "true";
    }

    /**
     * Sets the preference to show the deprecated resources in the trees/lists
     * @param showDeprecated 
     */
    setShowDeprecated(showDeprecated: boolean) {
        Cookie.setCookie(Cookie.SHOW_DEPRECATED, showDeprecated + "", 365*10);
    }
    /**
     * Gets the preference to show the deprecated resources in the trees/lists
     */
    getShowDeprecated(): boolean {
        let cookieValue: string = Cookie.getCookie(Cookie.SHOW_DEPRECATED);
        return cookieValue != "false"; //default true
    }

    
    initSearchSettingsCookie() {
        let projectSettings: ProjectPreferences = VBContext.getWorkingProjectCtx().getProjectPreferences();
        let searchModeCookie: string = Cookie.getCookie(Cookie.SEARCH_STRING_MATCH_MODE);
        if (searchModeCookie != null) {
            projectSettings.searchSettings.stringMatchMode = <SearchMode>searchModeCookie;
        }
        let useUriCookie: string = Cookie.getCookie(Cookie.SEARCH_USE_URI);
        if (useUriCookie != null) {
            projectSettings.searchSettings.useURI = useUriCookie == "true";
        }
        let useLocalNameCookie: string = Cookie.getCookie(Cookie.SEARCH_USE_LOCAL_NAME);
        if (useLocalNameCookie != null) {
            projectSettings.searchSettings.useLocalName = useLocalNameCookie == "true";
        }
        let useNotesCookie: string = Cookie.getCookie(Cookie.SEARCH_USE_NOTES);
        if (useNotesCookie != null) {
            projectSettings.searchSettings.useNotes = useNotesCookie == "true";
        }
        let restrictSchemesCookie: string = Cookie.getCookie(Cookie.SEARCH_CONCEPT_SCHEME_RESTRICTION);
        if (restrictSchemesCookie != null) {
            projectSettings.searchSettings.restrictActiveScheme = restrictSchemesCookie == "true";
        }
        let clsIndPanelSearchModeCookie: string = Cookie.getCookie(Cookie.SEARCH_CLS_IND_PANEL);
        if (clsIndPanelSearchModeCookie != null) {
            projectSettings.searchSettings.classIndividualSearchMode = <ClassIndividualPanelSearchMode>clsIndPanelSearchModeCookie;
        }
    }

    setSearchSettings(settings: SearchSettings) {
        let projectSettings: ProjectPreferences = VBContext.getWorkingProjectCtx().getProjectPreferences();

        Cookie.setCookie(Cookie.SEARCH_STRING_MATCH_MODE, settings.stringMatchMode, 365*10);
        Cookie.setCookie(Cookie.SEARCH_USE_URI, settings.useURI+"", 365*10);
        Cookie.setCookie(Cookie.SEARCH_USE_LOCAL_NAME, settings.useLocalName+"", 365*10);
        Cookie.setCookie(Cookie.SEARCH_USE_NOTES, settings.useNotes+"", 365*10);
        Cookie.setCookie(Cookie.SEARCH_CONCEPT_SCHEME_RESTRICTION, settings.restrictActiveScheme+"", 365*10);
        Cookie.setCookie(Cookie.SEARCH_CLS_IND_PANEL, settings.classIndividualSearchMode, 365*10);
        if (projectSettings.searchSettings.languages != settings.languages) {
            this.prefService.setPUSetting(Properties.pref_search_languages, JSON.stringify(settings.languages)).subscribe();
        }
        if (projectSettings.searchSettings.restrictLang != settings.restrictLang) {
            this.prefService.setPUSetting(Properties.pref_search_restrict_lang, settings.restrictLang+"").subscribe();
        }
        if (projectSettings.searchSettings.includeLocales != settings.includeLocales) {
            this.prefService.setPUSetting(Properties.pref_search_include_locales, settings.includeLocales+"").subscribe();
        }
        if (projectSettings.searchSettings.useAutocompletion != settings.useAutocompletion) {
            this.prefService.setPUSetting(Properties.pref_search_use_autocomplete, settings.useAutocompletion+"").subscribe();
        }
        projectSettings.searchSettings = settings;
        this.eventHandler.searchPrefsUpdatedEvent.emit();
    }

    
    getDefaultProjectTableColumns(): ProjectTableColumnStruct[] {
        return [
            { name: "Accessed", show: true, mandatory: true }, { name: "Open/Close", show: true, mandatory: true },
            { name: "Project Name", show: true, mandatory: true }, { name: "Model", show: true },
            { name: "Lexicalization Model", show: true }, { name: "History", show: true },
            { name: "Validation", show: true }, { name: "Repository Location", show: true }
        ];
    };
    getCustomProjectTableColumns(): ProjectTableColumnStruct[] {
        let defaultColumns: ProjectTableColumnStruct[] = this.getDefaultProjectTableColumns();
        var value = Cookie.getCookie(Cookie.PROJECT_TABLE_ORDER);
        if (value == null) {
            return defaultColumns;
        } else {
            let customColumns: ProjectTableColumnStruct[] = JSON.parse(value);
            /**
             * check if there is some default columns not stored in cookie (add it eventually)
             * and if there is some columns stored in the cookie not foreseen in the default columns structure
             * (feasible scenarios if, in the client, the project table structure is changed by adding/removing some columns,
             * so the column struct stored in the cookie is not in sync with the default one)
             */
            defaultColumns.forEach((col: ProjectTableColumnStruct) => {
                let columnFound: boolean = false;
                for (var i = 0; i < customColumns.length; i++) {
                    if (col.name == customColumns[i].name) {
                        columnFound = true;
                        break;
                    }
                }
                if (!columnFound) {
                    customColumns.push(col); //add the default column to the customized structure
                }
            });

            customColumns.forEach((col: ProjectTableColumnStruct) => {
                let columnFound: boolean = false;
                for (var i = 0; i < defaultColumns.length; i++) {
                    if (col.name == defaultColumns[i].name) {
                        columnFound = true;
                        break;
                    }
                }
                if (!columnFound) {
                    customColumns.splice(customColumns.indexOf(col), 1); //remove the column from the customized structure
                }
            });

            return customColumns;
        }
    }


    //EVENT HANDLER
    /**
     * In case of resource renamed, check if the resource is a current active scheme, in case update the preference
     * @param oldResource 
     * @param newResource 
     */
    private onResourceRenamed(oldResource: ARTResource, newResource: ARTResource) {
        let activeSchemes: ARTURIResource[] = VBContext.getWorkingProjectCtx().getProjectPreferences().activeSchemes;
        for (var i = 0; i < activeSchemes.length; i++) {
            if (activeSchemes[i].getNominalValue() == oldResource.getNominalValue()) {
                activeSchemes[i].setURI(newResource.getNominalValue());
                this.setActiveSchemes(activeSchemes);
                break;
            }
        }
    }

}
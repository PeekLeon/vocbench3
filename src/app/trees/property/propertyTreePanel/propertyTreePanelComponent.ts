import { Component, Input, ViewChild } from "@angular/core";
import { ARTURIResource, RDFResourceRolesEnum, ResAttribute, ResourceUtils, SortAttribute } from "../../../models/ARTResources";
import { SearchSettings } from "../../../models/Properties";
import { OWL, RDF } from "../../../models/Vocabulary";
import { CustomFormsServices } from "../../../services/customFormsServices";
import { PropertyServices } from "../../../services/propertyServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { SearchServices } from "../../../services/searchServices";
import { UIUtils } from "../../../utils/UIUtils";
import { VBEventHandler } from "../../../utils/VBEventHandler";
import { VBProperties } from "../../../utils/VBProperties";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { CreationModalServices } from "../../../widget/modal/creationModal/creationModalServices";
import { AbstractTreePanel } from "../../abstractTreePanel";
import { PropertyTreeComponent } from "../propertyTree/propertyTreeComponent";

@Component({
    selector: "property-tree-panel",
    templateUrl: "./propertyTreePanelComponent.html",
    host: { class: "vbox" }
})
export class PropertyTreePanelComponent extends AbstractTreePanel {
    @Input() resource: ARTURIResource;//provide to show just the properties with domain the type of the resource
    @Input() type: RDFResourceRolesEnum; //tells the type of the property to show in the tree
    @Input('roots') rootProperties: ARTURIResource[]; //in case the roots are provided to the component instead of being retrieved from server

    @ViewChild(PropertyTreeComponent) viewChildTree: PropertyTreeComponent;

    panelRole: RDFResourceRolesEnum = RDFResourceRolesEnum.property;
    rendering: boolean = false; //override the value in AbstractPanel

    constructor(private propService: PropertyServices, private searchService: SearchServices, private creationModals: CreationModalServices,
        cfService: CustomFormsServices, resourceService: ResourcesServices, basicModals: BasicModalServices,
        eventHandler: VBEventHandler, vbProp: VBProperties) {
        super(cfService, resourceService, basicModals, eventHandler, vbProp);
    }

    createRoot(role: RDFResourceRolesEnum) {
        let propertyType: ARTURIResource = this.convertRoleToClass(role);
        this.creationModals.newResourceCf("Create a new " + propertyType.getShow(), propertyType, false).then(
            (data: any) => {
                this.propService.createProperty(data.cls, data.uriResource, null, data.cfValue).subscribe();
            },
            () => {}
        );
    }

    createChild() {
        let parentRole: RDFResourceRolesEnum = this.selectedNode.getRole();
        let propertyType: ARTURIResource = this.convertRoleToClass(parentRole);
        this.creationModals.newResourceCf("Create subProperty of " + this.selectedNode.getShow(), propertyType, false).then(
            (data: any) => {
                this.propService.createProperty(data.cls, data.uriResource, this.selectedNode, data.cfValue).subscribe();
            },
            () => {}
        );
    }

    delete() {
        if (this.selectedNode.getAdditionalProperty(ResAttribute.MORE)) {
            this.basicModals.alert("Operation denied", "Cannot delete " + this.selectedNode.getURI() + 
                " since it has subProperty(ies). Please delete the subProperty(ies) and retry", "warning");
            return;
        }
        this.propService.deleteProperty(this.selectedNode).subscribe(
            stResp => {
                this.nodeDeleted.emit(this.selectedNode);
                this.selectedNode = null;
            }
        )
    }

    refresh() {
        this.viewChildTree.init();
    }

    //search handlers

    doSearch(searchedText: string) {
        let searchSettings: SearchSettings = this.vbProp.getSearchSettings();
        let searchLangs: string[];
        let includeLocales: boolean;
        if (searchSettings.restrictLang) {
            searchLangs = searchSettings.languages;
            includeLocales = searchSettings.includeLocales;
        }
        UIUtils.startLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
        this.searchService.searchResource(searchedText, [RDFResourceRolesEnum.property], searchSettings.useLocalName, 
            searchSettings.useURI, searchSettings.useNotes, searchSettings.stringMatchMode, searchLangs, includeLocales).subscribe(
            searchResult => {
                UIUtils.stopLoadingDiv(this.viewChildTree.blockDivElement.nativeElement);
                if (searchResult.length == 0) {
                    this.basicModals.alert("Search", "No results found for '" + searchedText + "'", "warning");
                } else { //1 or more results
                    if (searchResult.length == 1) {
                        this.openTreeAt(searchResult[0]);
                    } else { //multiple results, ask the user which one select
                        ResourceUtils.sortResources(searchResult, this.rendering ? SortAttribute.show : SortAttribute.value);
                        this.basicModals.selectResource("Search", searchResult.length + " results found.", searchResult, this.rendering).then(
                            (selectedResource: any) => {
                                this.openTreeAt(selectedResource);
                            },
                            () => { }
                        );
                    }
                }
            }
        );
    }

    openTreeAt(resource: ARTURIResource) {
        this.viewChildTree.openTreeAt(resource);
    }

    private convertRoleToClass(role: RDFResourceRolesEnum): ARTURIResource {
        let propertyType: ARTURIResource;
        if (role == RDFResourceRolesEnum.property) {
            propertyType = RDF.property;
        } else if (role == RDFResourceRolesEnum.datatypeProperty) {
            propertyType = OWL.datatypeProperty;
        } else if (role == RDFResourceRolesEnum.objectProperty) {
            propertyType = OWL.objectProperty;
        } else if (role == RDFResourceRolesEnum.annotationProperty) {
            propertyType = OWL.annotationProperty;
        } else if (role == RDFResourceRolesEnum.ontologyProperty) {
            propertyType = OWL.ontologyProperty;
        }
        return propertyType;
    }

}
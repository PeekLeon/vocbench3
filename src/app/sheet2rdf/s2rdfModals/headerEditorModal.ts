import { Component, Input } from "@angular/core";
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ARTURIResource } from 'src/app/models/ARTResources';
import { RDFCapabilityType } from 'src/app/models/Coda';
import { ModalOptions, ModalType } from 'src/app/widget/modal/Modals';
import { AdvancedGraphApplication, GraphApplication, NodeConversion, S2RDFModel, SimpleGraphApplication, SimpleHeader } from "../../models/Sheet2RDF";
import { RangeType } from "../../services/propertyServices";
import { Sheet2RDFServices } from "../../services/sheet2rdfServices";
import { ResourceUtils } from "../../utils/ResourceUtils";
import { VBContext } from "../../utils/VBContext";
import { BasicModalServices } from "../../widget/modal/basicModal/basicModalServices";
import { Sheet2RdfContextService } from "../sheet2rdfContext";
import { AdvancedGraphApplicationModal } from "./advancedGraphApplicationModal";
import { NodeCreationModal } from "./nodeCreationModal";
import { SimpleGraphApplicationModal } from "./simpleGraphApplicationModal";

@Component({
    selector: "header-editor-modal",
    templateUrl: "./headerEditorModal.html",
})
export class HeaderEditorModal {
    @Input() sheetName: string;
    @Input() headerId: string;

    private s2rdfModel: S2RDFModel;

    header: SimpleHeader;

    private ignoreInitialized: boolean = false;

    selectedNode: NodeConversion;
    selectedGraph: GraphApplication;

    private changed: boolean = false; //useful to keep trace of changes in order to ask to the user if he want to replicate the changes to multiple headers

    constructor(public activeModal: NgbActiveModal, private s2rdfService: Sheet2RDFServices, private s2rdfCtx: Sheet2RdfContextService,
        private basicModals: BasicModalServices, private modalService: NgbModal) {
    }

    ngOnInit() {
        this.s2rdfModel = this.s2rdfCtx.sheetModelMap.get(this.sheetName);

        this.initHeader();
    }

    initHeader() {
        this.selectedGraph = null;
        this.selectedNode = null;
        this.s2rdfService.getHeaderFromId(this.sheetName, this.headerId).subscribe(
            header => {
                this.header = header;
                if (!this.ignoreInitialized) {
                    this.ignoreInitialized = true;
                }
                //replace the header in the model (useful for keep the model updated in case initHeader in invoked after a change on the current header made in this editor)
                let idx = this.s2rdfModel.headers.findIndex(h => h.id == this.headerId);
                this.s2rdfModel.headers[idx] = this.header;
            }
        );
    }

    onIgnoreChange() {
        this.s2rdfService.ignoreHeader(this.sheetName, this.header.id, this.header.ignore).subscribe(
            () => {
                this.initHeader();
                this.changed = true;
            }
        );
    }

    /*
     * NODES
     */

    selectNode(node: NodeConversion) {
        if (this.header.ignore) return;

        if (this.selectedNode == node) {
            this.selectedNode = null;
        } else {
            this.selectedNode = node;
        }
    }

    addNode() {
        this.openNodeEditorModal(this.header, null, null, false, null, null, this.header.nodes).then(
            (newNode: NodeConversion) => {
                this.s2rdfService.addNodeToHeader(this.sheetName, this.header.id, newNode.nodeId, newNode.converter.type,
                    newNode.converter.contractUri, newNode.converter.datatypeUri, newNode.converter.language,
                    newNode.converter.params, newNode.memoize, newNode.memoizeId).subscribe(
                        () => {
                            this.initHeader();
                            this.changed = true;
                        }
                    );
            },
            () => { }
        );
    }

    renameNode(node: NodeConversion) {
        this.basicModals.prompt({ key: "ACTIONS.RENAME_NODE" }, { value: "ID" }, null, node.nodeId, false, true).then(
            (newID: string) => {
                if (newID != node.nodeId) {
                    this.s2rdfService.renameNodeId(this.sheetName, this.header.id, node.nodeId, newID).subscribe(
                        () => {
                            this.initHeader();
                            this.changed = true;
                        }
                    );
                }
            },
            () => { }
        );
    }

    removeNode() {
        //check if the node is used by some graph application
        let referenced: boolean = SimpleHeader.isNodeReferenced(this.header, this.selectedNode);
        //allow to forcing the deletion a referenced node or not allow at all? 
        if (referenced) { //cannot delete a node used by a graph application
            this.basicModals.confirm({ key: "STATUS.WARNING" }, { key: "MESSAGES.DELETE_HEADER_NODE_USED_IN_GRAPH_APP_CONFIRM" }, ModalType.warning).then(
                confirm => {
                    this.removeNodeImpl();
                },
                () => { }
            );
        } else {
            this.removeNodeImpl();
        }
    }
    private removeNodeImpl() {
        this.s2rdfService.removeNodeFromHeader(this.sheetName, this.header.id, this.selectedNode.nodeId).subscribe(
            () => {
                this.initHeader();
                this.changed = true;
            }
        );
    }

    changeConverter(node: NodeConversion) {
        let rangeType: RangeType = node.converter ? (node.converter.type == RDFCapabilityType.uri ? RangeType.resource : RangeType.literal) : null;
        this.openNodeEditorModal(this.header, node, rangeType, false, null, null, null).then(
            (updatedNode: NodeConversion) => {
                this.s2rdfService.updateNodeInHeader(this.sheetName, this.header.id, updatedNode.nodeId, updatedNode.converter.type, updatedNode.converter.contractUri,
                    updatedNode.converter.datatypeUri, updatedNode.converter.language, updatedNode.converter.params, updatedNode.memoize, updatedNode.memoizeId).subscribe(
                        () => {
                            this.initHeader();
                            this.changed = true;
                        }
                    );
            },
            () => { }
        );
    }

    private openNodeEditorModal(header: SimpleHeader, editingNode: NodeConversion, rangeType: RangeType, lockRangeType: boolean,
        constrainedLanguage: string, constrainedDatatype: ARTURIResource, headerNodes: NodeConversion[]) {
        const modalRef: NgbModalRef = this.modalService.open(NodeCreationModal, new ModalOptions('xl'));
        modalRef.componentInstance.sheetName = this.sheetName;
        modalRef.componentInstance.header = header;
        modalRef.componentInstance.editingNode = editingNode;
        modalRef.componentInstance.rangeTypeConfig = { type: rangeType, lock: lockRangeType };
        modalRef.componentInstance.constrainedLanguage = constrainedLanguage;
        modalRef.componentInstance.constrainedDatatype = constrainedDatatype;
        modalRef.componentInstance.headerNodes = headerNodes;
        return modalRef.result;
    }

    /*
     * GRAPH 
     */

    selectGraph(graph: GraphApplication) {
        if (this.header.ignore) return;

        if (this.selectedGraph == graph) {
            this.selectedGraph = null;
        } else {
            this.selectedGraph = graph;
        }
    }

    isSimpleGraphApplication(graph: GraphApplication): boolean {
        return graph instanceof SimpleGraphApplication;
    }

    editGraph() {
        if (this.selectedGraph instanceof SimpleGraphApplication) {
            this.openSimpleGraphApplicationModal(this.header, <SimpleGraphApplication>this.selectedGraph).then(
                () => {
                    this.initHeader();
                    this.changed = true;
                },
                () => { }
            );
        } else { //AdvancedGraphApplication
            this.openAdvancedGraphApplicationModal(this.header, <AdvancedGraphApplication>this.selectedGraph).then(
                () => {
                    this.initHeader();
                    this.changed = true;
                },
                () => { }
            );
        }
    }

    addSimpleGraphApplication() {
        this.openSimpleGraphApplicationModal(this.header, null).then(
            () => {
                this.initHeader();
                this.changed = true;
            },
            () => { }
        );
    }

    addAdvancedGraphApplication() {
        this.openAdvancedGraphApplicationModal(this.header, null).then(
            () => {
                this.initHeader();
                this.changed = true;
            },
            () => { }
        );
    }

    private openSimpleGraphApplicationModal(header: SimpleHeader, graphApplication: SimpleGraphApplication) {
        const modalRef: NgbModalRef = this.modalService.open(SimpleGraphApplicationModal, new ModalOptions());
        modalRef.componentInstance.sheetName = this.sheetName;
        modalRef.componentInstance.header = header;
        modalRef.componentInstance.graphApplication = graphApplication;
        return modalRef.result;
    }

    private openAdvancedGraphApplicationModal(header: SimpleHeader, graphApplication: AdvancedGraphApplication) {
        const modalRef: NgbModalRef = this.modalService.open(AdvancedGraphApplicationModal, new ModalOptions('lg'));
        modalRef.componentInstance.sheetName = this.sheetName;
        modalRef.componentInstance.header = header;
        modalRef.componentInstance.graphApplication = graphApplication;
        return modalRef.result;
    }

    removeGraph() {
        this.s2rdfService.removeGraphApplicationFromHeader(this.sheetName, this.header.id, this.selectedGraph.id).subscribe(
            resp => {
                this.initHeader();
                this.changed = true;
            }
        );
    }

    onDeleteChange(graphApplication: GraphApplication) {
        this.s2rdfService.updateGraphApplicationDelete(this.sheetName, this.header.id, graphApplication.id, graphApplication.delete).subscribe();
    }

    ok() {
        if (this.changed && this.header.isMultiple) {
            this.basicModals.confirm({ key: "STATUS.WARNING" }, { key: "MESSAGES.UPDATE_MULTIPLE_HEADER_SAME_NAME_CONFIRM", params: { headerName: this.header.nameStruct.name } },
                ModalType.warning).then(
                    confirm => {
                        this.s2rdfService.replicateMultipleHeader(this.sheetName, this.header.id).subscribe(
                            () => {
                                this.activeModal.close();
                            }
                        );
                    },
                    () => {
                        this.activeModal.close();
                    }
                );
        } else {
            this.activeModal.close();
        }
    }


    //UTILS

    private getDatatypeShow(datatypeUri: string) {
        return ResourceUtils.getQName(datatypeUri, VBContext.getPrefixMappings());
    }

}
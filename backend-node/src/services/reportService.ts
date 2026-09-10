import PDFDocument from 'pdfkit';
import { Project } from '../models/Project';

export class ReportService {
  public static generateProjectPDF(project: Project): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fontSize(20).text(`Project Report: ${project.name}`, { align: 'center' });
        doc.moveDown();

        // Metadata
        doc.fontSize(12).text(`Status: ${project.status}`);
        doc.text(`Priority: ${project.priority}`);
        doc.text(`Budget: $${project.budget ?? 0}`);
        doc.text(`Spent: $${project.spent ?? 0}`);
        doc.text(`Deadline: ${project.deadline || 'N/A'}`);
        doc.moveDown();

        doc.fontSize(14).text('Description:', { underline: true });
        doc.fontSize(11).text(project.description || 'No description provided.');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  public static generateProjectCSV(project: Project): string {
    const header = 'Project ID,Project Name,Status,Priority,Budget,Spent,Deadline\n';
    const row = `${project.id},"${project.name.replace(/"/g, '""')}",${project.status},${project.priority},${project.budget ?? 0},${project.spent ?? 0},"${project.deadline || ''}"\n`;
    return header + row;
  }
}

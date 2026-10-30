package mos.management.dashboard.service.report;

import mos.management.dashboard.dto.ReportDtos.BestSeller;
import mos.management.dashboard.dto.ReportDtos.DaySales;
import mos.management.dashboard.dto.ReportDtos.SalesReport;
import mos.management.dashboard.dto.ReportDtos.SourceSales;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.service.store.StoreService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** FR-29: the report as an .xlsx file (Apache POI). */
@Component
public class ExcelExporter {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ReportService reports;
    private final StoreService store;

    public ExcelExporter(ReportService reports, StoreService store) {
        this.reports = reports;
        this.store = store;
    }

    public byte[] export(ReportService.Period period) {
        SalesReport sales = reports.sales(period);
        List<BestSeller> best = reports.bestSellers(period, 50);
        List<Order> orders = reports.placedIn(period);
        ZoneId zone = store.zone();

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle bold = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            bold.setFont(font);
            CellStyle money = wb.createCellStyle();
            money.setDataFormat(wb.createDataFormat().getFormat("$#,##0.00"));

            Sheet summary = wb.createSheet("Summary");
            row(summary, 0, bold, "MOS sales report", store.current().getStoreName());
            row(summary, 1, null, "Period", sales.from() + " to " + sales.to());
            row(summary, 3, bold, "Orders", "Drinks", "Revenue", "Average order", "Cancelled or rejected");
            Row r = summary.createRow(4);
            r.createCell(0).setCellValue(sales.orders());
            r.createCell(1).setCellValue(sales.drinks());
            moneyCell(r, 2, sales.revenue(), money);
            moneyCell(r, 3, sales.averageOrder(), money);
            r.createCell(4).setCellValue(sales.cancelledOrRejected());
            row(summary, 6, bold, "Source", "Orders", "Revenue");
            int i = 7;
            for (SourceSales s : sales.bySource()) {
                Row sr = summary.createRow(i++);
                sr.createCell(0).setCellValue(s.source() == mos.management.dashboard.entity.OrderSource.ONLINE ? "Online" : "Walk-in");
                sr.createCell(1).setCellValue(s.orders());
                moneyCell(sr, 2, s.revenue(), money);
            }

            Sheet daily = wb.createSheet("Daily sales");
            row(daily, 0, bold, "Date", "Orders", "Revenue");
            i = 1;
            for (DaySales d : sales.byDay()) {
                Row dr = daily.createRow(i++);
                dr.createCell(0).setCellValue(d.date().toString());
                dr.createCell(1).setCellValue(d.orders());
                moneyCell(dr, 2, d.revenue(), money);
            }

            Sheet bestSheet = wb.createSheet("Best sellers");
            row(bestSheet, 0, bold, "Rank", "Drink", "Cups", "Revenue");
            i = 1;
            for (BestSeller b : best) {
                Row br = bestSheet.createRow(i);
                br.createCell(0).setCellValue(i++);
                br.createCell(1).setCellValue(b.productName());
                br.createCell(2).setCellValue(b.quantity());
                moneyCell(br, 3, b.revenue(), money);
            }

            Sheet list = wb.createSheet("Orders");
            row(list, 0, bold, "Pickup code", "Placed at", "Source", "Status", "Drinks", "Total");
            i = 1;
            for (Order o : orders) {
                Row or = list.createRow(i++);
                or.createCell(0).setCellValue(o.getPickupCode() == null ? "" : o.getPickupCode());
                or.createCell(1).setCellValue(TIME.format(o.getPlacedAt().atZone(zone)));
                or.createCell(2).setCellValue(o.getSource().dbValue());
                or.createCell(3).setCellValue(o.getStatus().dbValue());
                or.createCell(4).setCellValue(o.drinkCount());
                moneyCell(or, 5, o.getTotalAmount(), money);
            }
            for (Sheet s : List.of(summary, daily, bestSheet, list)) {
                for (int c = 0; c < 6; c++) s.autoSizeColumn(c);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void row(Sheet sheet, int index, CellStyle style, String... values) {
        Row row = sheet.createRow(index);
        for (int c = 0; c < values.length; c++) {
            Cell cell = row.createCell(c);
            cell.setCellValue(values[c]);
            if (style != null) cell.setCellStyle(style);
        }
    }

    private static void moneyCell(Row row, int col, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value.doubleValue());
        cell.setCellStyle(style);
    }
}

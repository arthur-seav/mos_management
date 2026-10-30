package mos.management.dashboard.web.admin;

import mos.management.dashboard.dto.ReportDtos.BestSeller;
import mos.management.dashboard.dto.ReportDtos.Overview;
import mos.management.dashboard.dto.ReportDtos.SalesReport;
import mos.management.dashboard.service.report.ExcelExporter;
import mos.management.dashboard.service.report.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** Reports are admin only (SA 1.5); the overview cards are for everyone on the dashboard. */
@RestController
@RequestMapping("/api/admin")
public class AdminReportController {

    static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ReportService reports;
    private final ExcelExporter excel;

    public AdminReportController(ReportService reports, ExcelExporter excel) {
        this.reports = reports;
        this.excel = excel;
    }

    @GetMapping("/overview")
    public Overview overview(Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return reports.overview(admin);
    }

    @GetMapping("/reports/sales")
    @PreAuthorize("hasRole('ADMIN')")
    public SalesReport sales(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.sales(reports.period(from, to));
    }

    @GetMapping("/reports/best-sellers")
    @PreAuthorize("hasRole('ADMIN')")
    public List<BestSeller> bestSellers(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(defaultValue = "10") int limit) {
        return reports.bestSellers(reports.period(from, to), limit);
    }

    @GetMapping("/reports/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        ReportService.Period period = reports.period(from, to);
        String name = "MOS-sales-" + period.from() + "-to-" + period.to() + ".xlsx";
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name).build().toString())
                .body(excel.export(period));
    }
}

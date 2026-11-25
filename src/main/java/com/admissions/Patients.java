package com.admissions;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class Patients {
    private static final Map<String, List<String>> OPTIONS = Map.of(
        "gender", List.of("Female", "Male", "Other", "Prefer not to say"),
        "ward", List.of("General Ward", "Private Ward", "ICU", "Emergency"),
        "department", List.of("General Medicine", "Cardiology", "Orthopedics", "Pediatrics"),
        "doctor", List.of("Dr. Ananya Rao", "Dr. Arjun Mehta", "Dr. Kavya Shah", "Dr. Rohan Patel"),
        "status", List.of("Admitted", "Discharged")
    );
    private final MongoTemplate mongo;

    public Patients(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @GetMapping("/options")
    Map<String, List<String>> options() {
        return OPTIONS;
    }

    @GetMapping("/patients")
    List<Patient> list() {
        var patients = new ArrayList<>(mongo.findAll(Patient.class));
        patients.sort(Comparator.comparing(Patient::admissionDate).reversed()
                                .thenComparing(Patient::name, String.CASE_INSENSITIVE_ORDER)
                                .thenComparing(Patient::id));
        return patients;
    }

    @PostMapping("/patients")
    @ResponseStatus(HttpStatus.CREATED)
    Patient add(@RequestBody Map<String, Object> body) {
        return mongo.insert(validate(body, new ObjectId().toHexString()));
    }

    @PutMapping("/patients/{id}")
    Patient edit(@PathVariable String id, @RequestBody Map<String, Object> body) {
        var patient = validate(body, id);
        var update = new Update().set("name", patient.name()).set("age", patient.age())
            .set("gender", patient.gender()).set("ward", patient.ward())
            .set("department", patient.department()).set("doctor", patient.doctor())
            .set("admissionDate", patient.admissionDate()).set("status", patient.status());
        return update(id, update);
    }

    @PatchMapping("/patients/{id}/discharge")
    Patient discharge(@PathVariable String id) {
        return update(id, new Update().set("status", "Discharged"));
    }

    @DeleteMapping("/patients/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable String id) {
        if (mongo.remove(byId(id), Patient.class).getDeletedCount() == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient was not found.");
        }
    }

    private Patient update(String id, Update update) {
        var patient = mongo.findAndModify(byId(id), update,
            org.springframework.data.mongodb.core.FindAndModifyOptions.options().returnNew(true), Patient.class);
        if (patient == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient was not found.");
        }
        return patient;
    }

    private Query byId(String id) {
        return Query.query(Criteria.where("id").is(id));
    }

    private Patient validate(Map<String, Object> body, String id) {
        var errors = new LinkedHashMap<String, String>();
        var name = body.get("name") instanceof String value ? value.strip() : "";
        if (!name.matches("\\p{L}+(?: +\\p{L}+)*")) {
            errors.put("name", "Enter a name using letters and spaces only.");
        }
        if (!(body.get("age") instanceof Integer age) || age < 0 || age > 120) {
            errors.put("age", "Enter a whole number from 0 to 120.");
        }
        for (var entry : OPTIONS.entrySet()) {
            if (!(body.get(entry.getKey()) instanceof String choice) || !entry.getValue().contains(choice)) {
                errors.put(entry.getKey(), "Select a valid " + entry.getKey() + ".");
            }
        }
        LocalDate date = null;
        if (body.get("admissionDate") instanceof String value && value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
            try {
                date = LocalDate.parse(value);
            } catch (DateTimeParseException ignored) {
                // Report invalid calendar dates alongside the other field errors.
            }
        }
        if (date == null || date.getYear() < 1 || date.isAfter(LocalDate.now(ZoneId.of("Asia/Kolkata")))) {
            errors.put("admissionDate", "Enter a valid admission date on or before today.");
        }
        if (!errors.isEmpty()) {
            throw new InvalidPatient(errors);
        }
        return new Patient(id, name, (Integer) body.get("age"), (String) body.get("gender"),
            (String) body.get("ward"), (String) body.get("department"), (String) body.get("doctor"),
            date, (String) body.get("status"));
    }

    @ExceptionHandler(InvalidPatient.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, Object> invalid(InvalidPatient exception) {
        return Map.of("message", "Check the highlighted fields.", "errors", exception.errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, String> malformed() {
        return Map.of("message", "Send a valid JSON object with the patient fields.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> failure(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason()));
    }

    private static class InvalidPatient extends RuntimeException {
        final Map<String, String> errors;

        InvalidPatient(Map<String, String> errors) {
            this.errors = errors;
        }
    }
}

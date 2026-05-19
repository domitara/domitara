package main

import (
	"context"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./data/uploads"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	// Idempotency: skip if seed user exists.
	var exists bool
	_ = pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@home.test')`).Scan(&exists)
	if exists {
		log.Println("seed data already present (admin@home.test exists) — skipping")
		return
	}

	s := &seeder{pool: pool, uploadDir: uploadDir, ctx: ctx}
	if err := s.run(); err != nil {
		log.Fatalf("seed: %v", err)
	}
	log.Println("seed complete")
}

type seeder struct {
	pool      *pgxpool.Pool
	uploadDir string
	ctx       context.Context
}

func (s *seeder) run() error {
	userID, err := s.createUser("admin@home.test", "Admin User", "password123", "admin")
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	log.Printf("created user %d", userID)

	home1, err := s.createHome("The Anderson Residence", "123 Maple Street", "Springfield", "IL", "62701", "house", 1998, 2450.00, 385000.00, 420000.00, "Chase Home Loans", "30yr fixed 6.5%%")
	if err != nil {
		return fmt.Errorf("create home1: %w", err)
	}
	log.Printf("created home %s", home1)

	home2, err := s.createHome("Lakeside Cabin", "88 Pine Ridge Road", "Lake Geneva", "WI", "53147", "house", 1985, 890.00, 0, 195000.00, "", "")
	if err != nil {
		return fmt.Errorf("create home2: %w", err)
	}
	log.Printf("created home %s", home2)

	if err := s.addMember(home1, userID, "owner"); err != nil {
		return err
	}
	if err := s.addMember(home2, userID, "owner"); err != nil {
		return err
	}

	// --- Home 1 locations ---
	livingRoom, err := s.createLocation(home1, "Living Room", nil, "Main living and entertainment area")
	if err != nil {
		return err
	}
	tvArea, err := s.createLocation(home1, "TV Area", &livingRoom, "Entertainment center corner")
	if err != nil {
		return err
	}
	kitchen, err := s.createLocation(home1, "Kitchen", nil, "")
	if err != nil {
		return err
	}
	masterBed, err := s.createLocation(home1, "Master Bedroom", nil, "")
	if err != nil {
		return err
	}
	garage, err := s.createLocation(home1, "Garage", nil, "Two-car attached garage")
	if err != nil {
		return err
	}
	basement, err := s.createLocation(home1, "Basement", nil, "Finished basement with utility room")
	if err != nil {
		return err
	}
	_ = tvArea

	// --- Home 2 locations ---
	mainRoom, err := s.createLocation(home2, "Main Room", nil, "")
	if err != nil {
		return err
	}
	cabin_bedroom, err := s.createLocation(home2, "Bedroom", nil, "")
	if err != nil {
		return err
	}
	deck, err := s.createLocation(home2, "Deck", nil, "Wraparound deck with lake view")
	if err != nil {
		return err
	}
	shed, err := s.createLocation(home2, "Storage Shed", nil, "")
	if err != nil {
		return err
	}
	_ = mainRoom
	_ = cabin_bedroom

	// --- Home 1 labels ---
	lblElec1, err := s.createLabel(home1, "Electronics", "#3b82f6")
	if err != nil {
		return err
	}
	lblAppl1, err := s.createLabel(home1, "Appliances", "#10b981")
	if err != nil {
		return err
	}
	lblFurn1, err := s.createLabel(home1, "Furniture", "#f59e0b")
	if err != nil {
		return err
	}
	lblTools1, err := s.createLabel(home1, "Tools", "#ef4444")
	if err != nil {
		return err
	}
	lblHvac1, err := s.createLabel(home1, "HVAC", "#8b5cf6")
	if err != nil {
		return err
	}
	lblGarden1, err := s.createLabel(home1, "Garden", "#84cc16")
	if err != nil {
		return err
	}
	_ = lblGarden1

	// --- Home 2 labels ---
	lblElec2, err := s.createLabel(home2, "Electronics", "#3b82f6")
	if err != nil {
		return err
	}
	lblAppl2, err := s.createLabel(home2, "Appliances", "#10b981")
	if err != nil {
		return err
	}
	lblTools2, err := s.createLabel(home2, "Tools", "#ef4444")
	if err != nil {
		return err
	}
	lblGarden2, err := s.createLabel(home2, "Garden", "#84cc16")
	if err != nil {
		return err
	}
	_ = lblElec2

	// --- Home 1 items ---
	tv, err := s.createItem(home1, "Samsung 65\" QLED TV", "65-inch 4K Smart TV with HDR", &livingRoom, "Samsung", "QN65Q80C", "SN-TV-2023-00142", 1299.99, "2023-03-15", "5 years parts/labor", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(tv, lblElec1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(tv, color.RGBA{30, 100, 200, 255}); err != nil {
		return err
	}

	macbook, err := s.createItem(home1, "MacBook Pro 14\"", "M3 Pro chip, 18GB RAM, 512GB SSD", &livingRoom, "Apple", "MacBook Pro 14 M3", "C02ZK1ABMD6T", 1999.00, "2023-11-10", "1 year AppleCare+", true)
	if err != nil {
		return err
	}
	if err := s.addLabel(macbook, lblElec1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(macbook, color.RGBA{50, 50, 50, 255}); err != nil {
		return err
	}

	printer, err := s.createItem(home1, "HP LaserJet Pro", "Monochrome laser printer", &masterBed, "HP", "LaserJet Pro M404n", "VNB3K44321", 249.00, "2022-01-20", "1 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(printer, lblElec1); err != nil {
		return err
	}

	router, err := s.createItem(home1, "Netgear Nighthawk Router", "WiFi 6 AX5400 dual-band", &livingRoom, "Netgear", "RAX54", "2YB147E11B302", 189.00, "2022-06-05", "2 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(router, lblElec1); err != nil {
		return err
	}

	thermostat, err := s.createItem(home1, "Ecobee Smart Thermostat", "Thermostat with SmartSensor", &livingRoom, "Ecobee", "EB-STATE6-01", "EBE-00123456", 249.00, "2021-09-12", "3 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(thermostat, lblElec1); err != nil {
		return err
	}
	if err := s.addLabel(thermostat, lblHvac1); err != nil {
		return err
	}

	doorbell, err := s.createItem(home1, "Ring Video Doorbell Pro 2", "HD video with head-to-toe view", &livingRoom, "Ring", "Video Doorbell Pro 2", "RVD2-202211-0047", 99.00, "2022-11-25", "1 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(doorbell, lblElec1); err != nil {
		return err
	}

	fridge, err := s.createItem(home1, "LG French Door Refrigerator", "27 cu ft, InstaView Door-in-Door", &kitchen, "LG", "LRMVS3006S", "701MRPN7Z784", 1799.00, "2020-05-18", "5 year compressor warranty", true)
	if err != nil {
		return err
	}
	if err := s.addLabel(fridge, lblAppl1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(fridge, color.RGBA{180, 220, 210, 255}); err != nil {
		return err
	}

	washer, err := s.createItem(home1, "Samsung Front-Load Washer", "5.0 cu ft, steam wash", &basement, "Samsung", "WF50R8500AV", "03YW3BMC900165T", 699.00, "2021-03-08", "1 year parts/labor", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(washer, lblAppl1); err != nil {
		return err
	}

	dryer, err := s.createItem(home1, "Samsung Electric Dryer", "7.5 cu ft, sensor dry", &basement, "Samsung", "DVE50R8500V", "03YW3BMC900188D", 649.00, "2021-03-08", "1 year parts/labor", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(dryer, lblAppl1); err != nil {
		return err
	}

	dishwasher, err := s.createItem(home1, "Bosch 500 Series Dishwasher", "24\", 44dBA, third rack", &kitchen, "Bosch", "SHPM88Z75N", "006120045912", 799.00, "2020-05-18", "5 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(dishwasher, lblAppl1); err != nil {
		return err
	}

	microwave, err := s.createItem(home1, "Panasonic Countertop Microwave", "1.3 cu ft, 1100W inverter", &kitchen, "Panasonic", "NN-SN67KS", "9J1029B101534", 129.00, "2019-08-30", "1 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(microwave, lblAppl1); err != nil {
		return err
	}

	hvacUnit, err := s.createItem(home1, "Carrier HVAC System", "3-ton central AC/heat pump", &basement, "Carrier", "24ACC636A003", "5114X20548", 3200.00, "2018-07-22", "10 year compressor, 5 year parts", true)
	if err != nil {
		return err
	}
	if err := s.addLabel(hvacUnit, lblHvac1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(hvacUnit, color.RGBA{140, 100, 220, 255}); err != nil {
		return err
	}

	waterHeater, err := s.createItem(home1, "Rheem Water Heater", "50-gallon natural gas", &basement, "Rheem", "PROG50-38N RH62", "WH19F0803422", 899.00, "2019-04-11", "6 year tank warranty", true)
	if err != nil {
		return err
	}
	if err := s.addLabel(waterHeater, lblHvac1); err != nil {
		return err
	}

	sofa, err := s.createItem(home1, "Ashley Sectional Sofa", "L-shaped, gray fabric, reversible chaise", &livingRoom, "Ashley Furniture", "Darcy Sectional", "", 1299.00, "2021-12-04", "", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(sofa, lblFurn1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(sofa, color.RGBA{160, 150, 140, 255}); err != nil {
		return err
	}

	diningTable, err := s.createItem(home1, "Pottery Barn Dining Table", "Farmhouse table, seats 8, reclaimed wood", &kitchen, "Pottery Barn", "Benchwright Extending", "", 899.00, "2022-02-14", "", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(diningTable, lblFurn1); err != nil {
		return err
	}

	bed, err := s.createItem(home1, "King Size Platform Bed Frame", "Upholstered headboard, solid wood", &masterBed, "Zinus", "Shalini Platform Bed", "", 599.00, "2022-08-19", "5 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(bed, lblFurn1); err != nil {
		return err
	}

	drill, err := s.createItem(home1, "DeWalt 20V Drill/Driver Kit", "Brushless, 2-speed, includes 2 batteries", &garage, "DeWalt", "DCD777C2", "DWS-2021-00842", 159.00, "2021-05-30", "3 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(drill, lblTools1); err != nil {
		return err
	}

	mower, err := s.createItem(home1, "Honda Self-Propelled Mower", "21\", Variable-speed, 200cc", &garage, "Honda", "HRX217VKA", "MAGA-2022-00123", 399.00, "2022-04-02", "3 year residential", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(mower, lblTools1); err != nil {
		return err
	}
	if err := s.addPhotoToItem(mower, color.RGBA{220, 50, 50, 255}); err != nil {
		return err
	}

	blower, err := s.createItem(home1, "Echo Handheld Leaf Blower", "58.2cc, 170mph", &garage, "Echo", "PB-580T", "S98914011396", 149.00, "2020-09-15", "5 year professional", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(blower, lblTools1); err != nil {
		return err
	}

	snowBlower, err := s.createItem(home1, "Craftsman 2-Stage Snow Blower", "24\", 208cc, electric start", &garage, "Craftsman", "CMXGBAM1054541", "SB24-2021-00091", 799.00, "2021-10-01", "2 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(snowBlower, lblTools1); err != nil {
		return err
	}

	// --- Home 2 items ---
	grill, err := s.createItem(home2, "Weber Spirit II Gas Grill", "3-burner, 529 sq in, natural gas", &deck, "Weber", "Spirit II E-310", "WS-2020-55241", 649.00, "2020-06-20", "10 year burner warranty", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(grill, lblAppl2); err != nil {
		return err
	}
	if err := s.addPhotoToItem(grill, color.RGBA{50, 50, 50, 255}); err != nil {
		return err
	}

	cooler, err := s.createItem(home2, "RTIC 65 Hard Cooler", "65qt, 5-day ice retention", &deck, "RTIC", "RTIC 65", "", 199.00, "2021-07-04", "", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(cooler, lblAppl2); err != nil {
		return err
	}

	chainsaw, err := s.createItem(home2, "Husqvarna 18\" Chainsaw", "50.2cc, X-Torq engine, AutoTune", &shed, "Husqvarna", "455 Rancher", "20181200056", 399.00, "2021-03-20", "2 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(chainsaw, lblTools2); err != nil {
		return err
	}

	pressureWasher, err := s.createItem(home2, "Craftsman Electric Pressure Washer", "2000 PSI, 1.2 GPM", &shed, "Craftsman", "CMEPW1700", "PW-2022-00412", 249.00, "2022-05-14", "2 year limited", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(pressureWasher, lblTools2); err != nil {
		return err
	}

	hose, err := s.createItem(home2, "Flexzilla Garden Hose 100ft", "3/4\" fittings, kink-free", &shed, "Flexzilla", "HFZ3450YW3", "", 49.00, "2022-04-10", "", false)
	if err != nil {
		return err
	}
	if err := s.addLabel(hose, lblGarden2); err != nil {
		return err
	}

	_ = printer
	_ = router
	_ = thermostat
	_ = doorbell
	_ = washer
	_ = dryer
	_ = dishwasher
	_ = microwave
	_ = waterHeater
	_ = diningTable
	_ = bed
	_ = drill
	_ = blower
	_ = snowBlower
	_ = cooler
	_ = chainsaw
	_ = pressureWasher
	_ = hose
	_ = macbook

	// --- Maintenance schedules for Home 1 ---
	now := time.Now()
	hvacSchedule, err := s.createMaintenanceSchedule(home1, &hvacUnit, "Replace HVAC Filter", "Use MERV-11 or higher filter. Current size: 16x25x1.", 3, "months", ptr(now.AddDate(0, -3, 0)), now.AddDate(0, 0, 7), userID)
	if err != nil {
		return err
	}

	gutterSchedule, err := s.createMaintenanceSchedule(home1, nil, "Clean Gutters", "Inspect downspouts for blockages. Consider guards after next cleaning.", 6, "months", ptr(now.AddDate(0, -5, 0)), now.AddDate(0, 1, 0), userID)
	if err != nil {
		return err
	}

	mowerSchedule, err := s.createMaintenanceSchedule(home1, &mower, "Mow Lawn", "Set blade height to 3.5\" in summer. Mulch clippings.", 2, "weeks", ptr(now.AddDate(0, 0, -12)), now.AddDate(0, 0, 2), userID)
	if err != nil {
		return err
	}

	_, err = s.createMaintenanceSchedule(home1, nil, "Inspect Roof", "Check flashing around chimney. Look for missing/damaged shingles.", 1, "years", ptr(now.AddDate(-1, 1, 0)), now.AddDate(0, 2, 0), userID)
	if err != nil {
		return err
	}

	_, err = s.createMaintenanceSchedule(home1, &hvacUnit, "HVAC Annual Service", "Schedule with Carrier certified technician. Check refrigerant levels.", 1, "years", ptr(now.AddDate(-1, 0, 0)), now.AddDate(0, 0, 30), userID)
	if err != nil {
		return err
	}

	// Maintenance schedules for Home 2
	_, err = s.createMaintenanceSchedule(home2, &grill, "Clean Gas Grill", "Clean burners, grease trap, and grates.", 3, "months", ptr(now.AddDate(0, -2, 0)), now.AddDate(0, 1, 0), userID)
	if err != nil {
		return err
	}

	// --- Maintenance logs for Home 1 ---
	if err := s.createMaintenanceLog(home1, &hvacUnit, &hvacSchedule, "Replace HVAC Filter", "Replaced with Filtrete MPR 1500. Filter was visibly dirty.", 12.99, now.AddDate(0, -3, 0), userID); err != nil {
		return err
	}

	if err := s.createMaintenanceLog(home1, nil, &gutterSchedule, "Clean Gutters", "Found significant debris in rear gutters. Cleared all downspouts. No damage found.", 0, now.AddDate(0, -5, 0), userID); err != nil {
		return err
	}

	if err := s.createMaintenanceLog(home1, &mower, &mowerSchedule, "Mow Lawn", "Cut back and front yard. Edged along driveway.", 0, now.AddDate(0, 0, -12), userID); err != nil {
		return err
	}

	if err := s.createMaintenanceLog(home1, &hvacUnit, nil, "HVAC Annual Service", "Technician from Cool Air HVAC (Mike) serviced unit. Refrigerant level OK. Replaced capacitor ($85 part). Cleaned coils.", 185.00, now.AddDate(0, -11, 0), userID); err != nil {
		return err
	}

	if err := s.createMaintenanceLog(home1, nil, nil, "Painted Living Room", "Painted walls Agreeable Gray SW 7029. Used 2 gallons. Touch up paint stored in garage.", 89.00, now.AddDate(-1, 3, 0), userID); err != nil {
		return err
	}

	return nil
}

func (s *seeder) createUser(email, name, password, role string) (int64, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}
	var id int64
	err = s.pool.QueryRow(s.ctx,
		`INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
		email, name, string(hash), role,
	).Scan(&id)
	return id, err
}

func (s *seeder) createHome(name, street, city, state, zip, propType string, yearBuilt int, sqft, purchasePrice, estimatedValue float64, lender, mortgageNotes string) (string, error) {
	var purchasedAt *time.Time
	if purchasePrice > 0 {
		t := time.Date(2018, time.June, 1, 0, 0, 0, 0, time.UTC)
		purchasedAt = &t
	}
	var id string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO homes (name, address_street, address_city, address_state, address_zip, property_type, year_built, sqft, purchase_price, purchased_at, estimated_value, mortgage_lender, mortgage_notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		name, street, city, state, zip, propType, yearBuilt, sqft, nullFloat(purchasePrice), purchasedAt, nullFloat(estimatedValue), nullStr(lender), nullStr(mortgageNotes),
	).Scan(&id)
	return id, err
}

func (s *seeder) addMember(homeID string, userID int64, role string) error {
	_, err := s.pool.Exec(s.ctx,
		`INSERT INTO home_members (home_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		homeID, userID, role,
	)
	return err
}

func (s *seeder) createLocation(homeID, name string, parentID *string, desc string) (string, error) {
	var id string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO locations (home_id, name, parent_id, description) VALUES ($1,$2,$3,$4) RETURNING id`,
		homeID, name, parentID, nullStr(desc),
	).Scan(&id)
	return id, err
}

func (s *seeder) createLabel(homeID, name, colorHex string) (string, error) {
	var id string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO labels (home_id, name, color) VALUES ($1,$2,$3) RETURNING id`,
		homeID, name, colorHex,
	).Scan(&id)
	return id, err
}

func (s *seeder) createItem(homeID, name, desc string, locationID *string, manufacturer, model, serial string, price float64, purchasedAt, warranty string, insured bool) (string, error) {
	var purchDate *time.Time
	if purchasedAt != "" {
		t, err := time.Parse("2006-01-02", purchasedAt)
		if err == nil {
			purchDate = &t
		}
	}
	var id string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO items (home_id, name, description, location_id, manufacturer, model, serial, purchase_price, purchased_at, warranty, insured)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		homeID, name, nullStr(desc), locationID, nullStr(manufacturer), nullStr(model), nullStr(serial),
		nullFloat(price), purchDate, nullStr(warranty), insured,
	).Scan(&id)
	return id, err
}

func (s *seeder) addLabel(itemID, labelID string) error {
	_, err := s.pool.Exec(s.ctx,
		`INSERT INTO item_labels (item_id, label_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
		itemID, labelID,
	)
	return err
}

func (s *seeder) addPhotoToItem(itemID string, bg color.RGBA) error {
	img := image.NewRGBA(image.Rect(0, 0, 400, 300))
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	// Add a lighter inner rectangle to give some visual depth.
	inner := image.Rect(20, 20, 380, 280)
	lighter := color.RGBA{
		R: clamp(int(bg.R) + 40),
		G: clamp(int(bg.G) + 40),
		B: clamp(int(bg.B) + 40),
		A: 255,
	}
	draw.Draw(img, inner, &image.Uniform{lighter}, image.Point{}, draw.Src)

	// Create DB record first.
	var photoID string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO item_photos (item_id, filename, content_type, file_path) VALUES ($1,$2,$3,'pending') RETURNING id`,
		itemID, "photo.png", "image/png",
	).Scan(&photoID)
	if err != nil {
		return err
	}

	itemDir := filepath.Join(s.uploadDir, itemID)
	if err := os.MkdirAll(itemDir, 0o755); err != nil {
		return err
	}
	relPath := itemID + "/" + photoID + ".png"
	f, err := os.Create(filepath.Join(s.uploadDir, relPath))
	if err != nil {
		return err
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		return err
	}

	_, err = s.pool.Exec(s.ctx,
		`UPDATE item_photos SET file_path = $1 WHERE id = $2`,
		relPath, photoID,
	)
	return err
}

func (s *seeder) createMaintenanceSchedule(homeID string, itemID *string, title, notes string, freqValue int, freqUnit string, lastPerformed *time.Time, nextDue time.Time, userID int64) (string, error) {
	var id string
	err := s.pool.QueryRow(s.ctx,
		`INSERT INTO maintenance_schedules (home_id, item_id, title, notes, frequency_value, frequency_unit, last_performed_at, next_due_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		homeID, itemID, title, nullStr(notes), freqValue, freqUnit, lastPerformed, nextDue.Format("2006-01-02"), userID,
	).Scan(&id)
	return id, err
}

func (s *seeder) createMaintenanceLog(homeID string, itemID *string, scheduleID *string, title, notes string, cost float64, performedAt time.Time, userID int64) error {
	_, err := s.pool.Exec(s.ctx,
		`INSERT INTO maintenance_logs (home_id, item_id, schedule_id, title, notes, cost, performed_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		nullStr(homeID), itemID, scheduleID, title, nullStr(notes), nullFloat(cost), performedAt.Format("2006-01-02"), userID,
	)
	return err
}

// --- helpers ---

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nullFloat(f float64) *float64 {
	if f == 0 {
		return nil
	}
	return &f
}

func ptr(t time.Time) *time.Time { return &t }

func clamp(v int) uint8 {
	if v > 255 {
		return 255
	}
	if v < 0 {
		return 0
	}
	return uint8(v)
}
